/**
 * Image Moderation Service (Part 9 - Performance, Reliability, and Resource Optimization)
 * 
 * Key Enhancements:
 * 1. Reuses pre-loaded AI model instances in memory (Part 9).
 * 2. In-Flight Request Deduplication: Reuses active Promise for identical simultaneous requests.
 * 3. Single-Pass Preprocessing: Generates AI tensor + optimized OCR buffer in one pass.
 * 4. Parallel Dispatch: Concurrently runs Vision AI and Tesseract OCR via Promise.all.
 * 5. Timeout & Concurrency Protection: Fail-closed timeout (25s) and controlled error responses.
 * 6. Structured Performance Logging: Measures and logs prep, vision, OCR, and decision latencies.
 * 7. Memory Cleanup: Dereferences buffers and tensors in finally blocks.
 */

const crypto = require('crypto');
const { preprocessImage, DEFAULT_CONFIG } = require('./imagePreprocessor.cjs');
const { extractTextFromImage } = require('./imageOcrService.cjs');
const { finalImageModerationDecision, DEFAULT_DECISION_CONFIG } = require('./imageDecisionEngine.cjs');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const IMAGE_MODERATION_TIMEOUT_MS = parseInt(process.env.IMAGE_MODERATION_TIMEOUT_MS || '25000', 10);

// In-Flight Request Deduplication Map
// Key: SHA-256 fingerprint -> Active Promise
const inFlightModerations = new Map();

/**
 * Computes a lightweight fingerprint for in-flight request deduplication.
 */
function computeRequestFingerprint(image, senderId, receiverId) {
  const hash = crypto.createHash('sha256');
  hash.update(`${senderId || 0}:${receiverId || 0}:`);
  if (typeof image === 'string') {
    const len = image.length;
    hash.update(`${len}:`);
    if (len <= 4096) {
      hash.update(image);
    } else {
      hash.update(image.slice(0, 1024));
      hash.update(image.slice(Math.floor(len / 2), Math.floor(len / 2) + 1024));
      hash.update(image.slice(-1024));
    }
  } else if (Buffer.isBuffer(image)) {
    hash.update(image);
  }
  return hash.digest('hex');
}

/**
 * Cleans extracted OCR text, eliminates non-linguistic noise artifacts, and evaluates
 * whether the text contains meaningful linguistic content suitable for abuse moderation.
 * 
 * Prevents OCR hallucinations on portraits, natural textures, and geometric graphics
 * from being misclassified as abusive text.
 * 
 * @param {string} rawText - Raw OCR text output from Tesseract
 * @returns {{ isMeaningful: boolean, cleanedText: string, words: string[] }}
 */
function filterMeaningfulOcrText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { isMeaningful: false, cleanedText: '', words: [] };
  }

  // 1. Remove non-linguistic OCR noise symbols and punctuation debris
  // Keep Latin letters, Telugu script (\u0C00-\u0C7F), digits, and standard word-forming characters
  const strippedNoise = rawText
    .replace(/[|\\/=_~<>^`{}*#@$%&+[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!strippedNoise) {
    return { isMeaningful: false, cleanedText: '', words: [] };
  }

  // 2. Tokenize by whitespace and filter out isolated noise tokens
  const rawTokens = strippedNoise.split(/\s+/);
  const validWords = [];

  for (const token of rawTokens) {
    // Strip leading/trailing punctuation from each individual token
    const cleaned = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!cleaned) continue;

    // Count recognized Latin and Telugu letters
    const latinLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
    const teluguLetters = (cleaned.match(/[\u0C00-\u0C7F]/g) || []).length;
    const totalLetters = latinLetters + teluguLetters;

    // Reject isolated 1-character tokens that are not valid standalone words ('a', 'A', 'I')
    if (totalLetters === 1 && !['a', 'A', 'I'].includes(cleaned)) {
      continue;
    }

    // A valid word token should contain at least 2 characters unless it's 'a' or 'I'
    if (totalLetters >= 2 || ['a', 'A', 'I'].includes(cleaned)) {
      // Must not be predominantly digits or non-letter characters
      if (totalLetters >= cleaned.length * 0.4) {
        // Collapse excessive consecutive character repetition (e.g. "iiiidiot" -> "idiot")
        const deduplicated = cleaned.replace(/(.)\1{2,}/g, '$1$1');
        validWords.push(deduplicated);
      }
    }
  }

  const cleanedText = validWords.join(' ').trim();
  const totalLetters = (cleanedText.match(/[a-zA-Z\u0C00-\u0C7F]/g) || []).length;

  // Criteria for meaningful linguistic content:
  // 1. Total valid letters must be at least 3
  // 2. Must contain at least one substantial word (length >= 3) OR at least two words (length >= 2)
  const hasSubstantialWord = validWords.some(w => {
    const len = (w.match(/[a-zA-Z\u0C00-\u0C7F]/g) || []).length;
    return len >= 3;
  });
  const hasMultipleWords = validWords.filter(w => {
    const len = (w.match(/[a-zA-Z\u0C00-\u0C7F]/g) || []).length;
    return len >= 2;
  }).length >= 2;

  const isMeaningful = totalLetters >= 3 && (hasSubstantialWord || hasMultipleWords);

  return {
    isMeaningful,
    cleanedText: isMeaningful ? cleanedText : '',
    words: validWords
  };
}

/**
 * Normalizes text extracted from OCR before passing to text moderation.
 */
function normalizeOcrText(rawText) {
  return filterMeaningfulOcrText(rawText).cleanedText;
}

/**
 * Moderates an image using both Computer Vision AI and OCR text abuse detection.
 * Enforces in-flight deduplication, parallel dispatch, timeout protection, and performance logging.
 * 
 * @param {string|Buffer} image - Raw base64 data URL, string, or Buffer
 * @param {Object} [options] - Options including senderId, receiverId, and textModerator callback
 * @returns {Promise<Object>} Combined moderation result
 */
async function moderateImage(image, options = {}) {
  if (!image || (typeof image === 'string' && !image.trim())) {
    return {
      isAbusive: false,
      status: 'SAFE',
      sources: [],
      categories: [],
      confidence: 0,
      allowed: true
    };
  }

  // 1. In-Flight Request Deduplication (Part 9)
  const fingerprint = computeRequestFingerprint(image, options.senderId, options.receiverId);
  if (inFlightModerations.has(fingerprint)) {
    console.log(`[IMAGE MODERATION DEDUP] Reusing active moderation task for fingerprint ${fingerprint.slice(0, 8)}`);
    return inFlightModerations.get(fingerprint);
  }

  // 2. Wrap execution with timeout protection
  const moderationPromise = executeModerationWithTimeout(image, options, fingerprint);
  inFlightModerations.set(fingerprint, moderationPromise);

  try {
    return await moderationPromise;
  } finally {
    inFlightModerations.delete(fingerprint);
  }
}

/**
 * Executes the moderation pipeline with a fail-closed timeout wrapper.
 */
async function executeModerationWithTimeout(image, options, fingerprint) {
  let timeoutTimer;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutTimer = setTimeout(() => {
      const err = new Error(`Image moderation timed out after ${IMAGE_MODERATION_TIMEOUT_MS}ms.`);
      err.name = 'ImageModerationTimeoutError';
      err.statusCode = 503;
      reject(err);
    }, IMAGE_MODERATION_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      executeModerationCore(image, options, fingerprint),
      timeoutPromise
    ]);
    return result;
  } finally {
    clearTimeout(timeoutTimer);
  }
}

/**
 * Core image moderation execution with single-pass preprocessing, parallel inference, and performance metrics.
 */
async function executeModerationCore(image, options, fingerprint) {
  const reqId = fingerprint.slice(0, 8);
  const t0 = Date.now();
  let tPrep = 0;
  let tVision = 0;
  let tOcr = 0;
  let tDecision = 0;

  let preprocessed = null;

  try {
    console.log(`[IMAGE MODERATION] [reqId: ${reqId}] Starting image moderation check`);

    // 1. Single-Pass Preprocessing (Part 2, 8, & 9)
    const prepStart = Date.now();
    preprocessed = await preprocessImage(image, options.preprocessingConfig);
    tPrep = Date.now() - prepStart;
    console.log(`[IMAGE PREPROCESSOR] [reqId: ${reqId}] Preprocessed image into tensor [${preprocessed.shape.join(', ')}] in ${tPrep}ms`);

    // 2. Parallel Dispatch: Concurrently execute Vision AI inference and OCR text extraction
    const tensorBase64 = Buffer.from(preprocessed.tensor.buffer).toString('base64');
    const ocrInputBuffer = preprocessed.ocrBuffer || image;

    // Path A: Vision Safety + Synthetic Detector (FastAPI :8000)
    const visionTask = (async () => {
      const vStart = Date.now();
      const response = await fetch(`${AI_SERVICE_URL}/moderate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tensor_base64: tensorBase64,
          shape: preprocessed.shape
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[IMAGE MODERATION] [reqId: ${reqId}] Vision AI service returned HTTP ${response.status}: ${errBody}`);
        throw new Error(`Vision safety AI service returned error (${response.status}).`);
      }

      const vData = await response.json();
      tVision = Date.now() - vStart;
      return vData;
    })();

    // Path B: Tesseract OCR Engine (Node worker singleton)
    const ocrTask = (async () => {
      const oStart = Date.now();
      let rawText = '';
      try {
        rawText = await extractTextFromImage(ocrInputBuffer);
      } catch (ocrErr) {
        console.warn(`[IMAGE OCR] [reqId: ${reqId}] OCR extraction failed non-critically:`, ocrErr.message || ocrErr);
      }
      tOcr = Date.now() - oStart;
      return rawText;
    })();

    // Execute concurrently (Part 9 - Concurrency Optimization)
    const [visualResult, extractedRawText] = await Promise.all([visionTask, ocrTask]);

    const syntheticResult = visualResult.synthetic || {
      isSynthetic: false,
      isManipulated: false,
      confidence: 0,
      status: 'NO_SIGNIFICANT_SYNTHETIC_SIGNAL'
    };

    // 3. Process Extracted OCR Text through Existing Text Moderation
    const ocrAnalysis = filterMeaningfulOcrText(extractedRawText);
    let textModerationResult = { isAbusive: false, categories: [], confidence: 0 };

    if (ocrAnalysis.isMeaningful && options.textModerator && typeof options.textModerator === 'function') {
      try {
        textModerationResult = await options.textModerator(ocrAnalysis.cleanedText);
      } catch (textModErr) {
        console.warn(`[IMAGE MODERATION] [reqId: ${reqId}] OCR text moderation warning:`, textModErr.message || textModErr);
      }
    }

    const isTextAbusive = Boolean(textModerationResult.isAbusive);

    // 4. Decision Engine (Part 6 Rules)
    const decStart = Date.now();
    const ocrModerationPayload = {
      isAbusive: isTextAbusive,
      categories: textModerationResult.categories || (isTextAbusive ? ['ABUSIVE_TEXT'] : []),
      confidence: textModerationResult.confidence || 0,
      source: textModerationResult.source || null,
      rawText: extractedRawText,
      normalizedText: ocrAnalysis.cleanedText,
      isMeaningfulText: ocrAnalysis.isMeaningful
    };

    const finalDecision = finalImageModerationDecision({
      visualResult,
      ocrResult: ocrModerationPayload,
      syntheticResult,
      config: options.decisionConfig
    });
    tDecision = Date.now() - decStart;

    const tTotal = Date.now() - t0;

    // 5. Structured Performance Logging (Part 9 - Performance Metrics)
    console.log(`[IMAGE MODERATION PERF] [reqId: ${reqId}] total: ${tTotal}ms | prep: ${tPrep}ms | vision: ${tVision}ms | ocr: ${tOcr}ms | decision: ${tDecision}ms | status: ${finalDecision.status} (Allowed: ${finalDecision.allowed}, Abusive: ${finalDecision.isAbusive})`);

    return finalDecision;
  } catch (error) {
    const tTotal = Date.now() - t0;
    console.error(`[IMAGE MODERATION] [reqId: ${reqId}] Error after ${tTotal}ms:`, error.message || error);
    // Fail-closed architecture
    throw error;
  } finally {
    // 6. Explicit Memory Cleanup (Part 9 - Buffer & Tensor Dereferencing)
    if (preprocessed) {
      preprocessed.tensor = null;
      preprocessed.ocrBuffer = null;
      preprocessed = null;
    }
  }
}

module.exports = {
  moderateImage,
  finalImageModerationDecision,
  DEFAULT_DECISION_CONFIG,
  preprocessImage,
  filterMeaningfulOcrText,
  normalizeOcrText,
  DEFAULT_CONFIG,
  computeRequestFingerprint,
  inFlightModerations
};
