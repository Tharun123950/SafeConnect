/**
 * Final Image Moderation Decision Engine (Part 6)
 * 
 * Responsibilities:
 * 1. Consumes independent results from:
 *    - Part 3: Visual Safety Model (Falconsai ViT)
 *    - Part 4: Multi-Lingual OCR + Text Moderation Pipeline (Tesseract + SafeConnect rules)
 *    - Part 5: Synthetic / Manipulated Image Detector (umm-maybe Swin Transformer)
 * 2. Applies the final backend decision rules:
 *    - IF visualResult.isAbusive == true -> ABUSIVE
 *    - ELSE IF ocrResult.isAbusive == true -> ABUSIVE
 *    - ELSE IF syntheticResult.isSynthetic == true AND harmful-content evidence exists -> ABUSIVE
 *    - ELSE -> SAFE
 * 3. Aggregates and deduplicates categories without inventing unsupported ones
 * 4. Preserves model-reported confidences and provides configurable aggregation
 * 5. Strictly enforces policy: AI-generated does NOT automatically mean abusive.
 *    (Synthetic signal is supporting evidence only; benign AI art/photos are SAFE)
 */

const DEFAULT_DECISION_CONFIG = {
  // Strategy for single confidence value: 'primary_evidence' (max abusive score) or 'weighted_average'
  confidenceAggregationStrategy: 'primary_evidence',
  
  // Synthetic weight when computing weighted average
  syntheticWeight: 0.5,

  // Fallback confidence when detector returns undefined/zero
  defaultAbusiveConfidence: 0.95,
  defaultSafeConfidence: 1.0
};

/**
 * Aggregates individual model confidences into a single mathematically sound value.
 * 
 * @param {Object} params
 * @param {boolean} params.isAbusive - Overall abusive status
 * @param {boolean} params.isVisualAbusive - Visual model flagged abuse
 * @param {boolean} params.isOcrAbusive - OCR text moderation flagged abuse
 * @param {boolean} params.isSynthetic - Synthetic detector flagged synthetic/manipulated
 * @param {number} params.visualConf - Visual model confidence
 * @param {number} params.ocrConf - OCR text moderation confidence
 * @param {number} params.synConf - Synthetic model confidence
 * @param {Object} params.config - Engine configuration
 * @returns {number} Aggregated confidence rounded to 4 decimals
 */
function aggregateConfidence({
  isAbusive,
  isVisualAbusive,
  isOcrAbusive,
  isSynthetic,
  visualConf,
  ocrConf,
  synConf,
  config
}) {
  const cfg = { ...DEFAULT_DECISION_CONFIG, ...config };

  if (!isAbusive) {
    // For safe content, report safe visual confidence if present, or default safe confidence
    return visualConf > 0 ? floatRound(visualConf, 4) : cfg.defaultSafeConfidence;
  }

  if (cfg.confidenceAggregationStrategy === 'weighted_average') {
    let totalWeight = 0;
    let weightedSum = 0;

    if (isVisualAbusive && visualConf > 0) {
      weightedSum += visualConf * 1.0;
      totalWeight += 1.0;
    }
    if (isOcrAbusive && ocrConf > 0) {
      weightedSum += ocrConf * 1.0;
      totalWeight += 1.0;
    }
    if (isSynthetic && synConf > 0) {
      const synW = cfg.syntheticWeight || 0.5;
      weightedSum += synConf * synW;
      totalWeight += synW;
    }

    if (totalWeight > 0) {
      return floatRound(weightedSum / totalWeight, 4);
    }
    return cfg.defaultAbusiveConfidence;
  }

  // Default 'primary_evidence': Take the highest confidence among the confirmed abusive sources
  const activeConfidences = [];
  if (isVisualAbusive && visualConf > 0) activeConfidences.push(visualConf);
  if (isOcrAbusive && ocrConf > 0) activeConfidences.push(ocrConf);

  if (activeConfidences.length > 0) {
    return floatRound(Math.max(...activeConfidences), 4);
  }

  return cfg.defaultAbusiveConfidence;
}

/**
 * Evaluates the final image moderation decision from Parts 3, 4, and 5 results.
 * 
 * @param {Object} input
 * @param {Object} [input.visualResult] - Output of Part 3 visual safety model
 * @param {Object} [input.ocrResult] - Output of Part 4 OCR text moderation
 * @param {Object} [input.syntheticResult] - Output of Part 5 synthetic/manipulated detector
 * @param {Object} [input.config] - Optional configuration overrides
 * @returns {Object} Final authoritative moderation decision
 */
function finalImageModerationDecision({
  visualResult = {},
  ocrResult = {},
  syntheticResult = {},
  config = {}
} = {}) {
  const cfg = { ...DEFAULT_DECISION_CONFIG, ...config };

  // 0. Check for component errors (MODERATION_ERROR state)
  if (visualResult?.status === 'MODERATION_ERROR' || visualResult?.error) {
    return {
      isAbusive: false,
      status: 'MODERATION_ERROR',
      allowed: false,
      error: visualResult.error || 'Visual moderation failed.',
      sources: [],
      categories: [],
      confidence: 0,
      confidenceBreakdown: { visual: 0, ocr: 0, synthetic: 0 },
      synthetic: {
        isSynthetic: false,
        isManipulated: false,
        confidence: 0,
        status: 'ERROR'
      },
      details: {
        visual: {},
        synthetic: {},
        ocrDetected: false,
        ocrTextLength: 0,
        textAbuseSource: null,
        confidenceBreakdown: { visual: 0, ocr: 0, synthetic: 0 }
      }
    };
  }

  // 1. Extract individual detection signals
  const isVisualAbusive = Boolean(visualResult && visualResult.isAbusive);
  const visualCategories = Array.isArray(visualResult?.categories) ? visualResult.categories : [];
  const visualConfidence = typeof visualResult?.confidence === 'number' ? visualResult.confidence : 0;

  const isOcrAbusive = Boolean(ocrResult && ocrResult.isAbusive);
  const ocrCategories = Array.isArray(ocrResult?.categories) ? ocrResult.categories : [];
  const ocrConfidence = typeof ocrResult?.confidence === 'number' ? ocrResult.confidence : 0;

  const isSynthetic = Boolean(syntheticResult && (syntheticResult.isSynthetic || syntheticResult.isManipulated));
  const syntheticConfidence = typeof syntheticResult?.confidence === 'number' ? syntheticResult.confidence : 0;

  // 2. Evaluate Harmful Content Evidence
  // RULE: Harmful content (visual or text) must be the primary basis for blocking.
  // Synthetic detection is supporting evidence. AI-generated alone NEVER makes an image abusive.
  const harmfulContentExists = isVisualAbusive || isOcrAbusive;

  let isAbusive = false;
  let status = 'SAFE';

  if (harmfulContentExists) {
    isAbusive = true;
    status = 'ABUSIVE';
  } else {
    // Clean human image OR benign AI image (art, landscape, avatar, photo)
    isAbusive = false;
    status = 'SAFE';
  }

  // 3. Assemble Multiple Sources
  const sources = [];
  if (isAbusive) {
    if (isVisualAbusive) {
      sources.push('VISUAL_AI');
    }
    if (isOcrAbusive) {
      sources.push('OCR_TEXT');
    }
    if (isSynthetic) {
      sources.push('SYNTHETIC_ANALYSIS');
    }
  }

  // 4. Assemble & Deduplicate Categories
  let categories = [];
  if (isAbusive) {
    const rawCategories = [];

    // Add reported visual categories
    for (const cat of visualCategories) {
      if (cat && typeof cat === 'string') {
        rawCategories.push(cat.trim().toUpperCase());
      }
    }

    // Add reported OCR categories
    for (const cat of ocrCategories) {
      if (cat && typeof cat === 'string') {
        rawCategories.push(cat.trim().toUpperCase());
      }
    }

    // If synthetic signal is present on harmful content, add synthetic category
    if (isSynthetic) {
      const hasSexualVisual = rawCategories.some(c => c.includes('NSFW') || c.includes('SEXUAL') || c.includes('NUDITY'));
      if (hasSexualVisual) {
        rawCategories.push('SYNTHETIC_SEXUAL_CONTENT');
      } else {
        rawCategories.push('SYNTHETIC_ABUSE');
      }
    }

    // Deduplicate
    categories = Array.from(new Set(rawCategories.filter(Boolean)));
  }

  // 5. Confidence Calculation & Breakdown
  const confidenceBreakdown = {
    visual: floatRound(visualConfidence, 4),
    ocr: floatRound(ocrConfidence, 4),
    synthetic: floatRound(syntheticConfidence, 4)
  };

  const confidence = aggregateConfidence({
    isAbusive,
    isVisualAbusive,
    isOcrAbusive,
    isSynthetic,
    visualConf: visualConfidence,
    ocrConf: ocrConfidence,
    synConf: syntheticConfidence,
    config: cfg
  });

  // 6. Final Structured Decision Object
  return {
    isAbusive,
    status,
    allowed: !isAbusive,
    sources,
    categories,
    confidence,
    confidenceBreakdown,
    synthetic: {
      isSynthetic,
      isManipulated: Boolean(syntheticResult?.isManipulated || isSynthetic),
      confidence: floatRound(syntheticConfidence, 4),
      status: syntheticResult?.status || (isSynthetic ? 'SYNTHETIC_OR_MANIPULATED' : 'NO_SIGNIFICANT_SYNTHETIC_SIGNAL')
    },
    details: {
      visual: visualResult?.details || {},
      synthetic: syntheticResult?.scores || {},
      ocrDetected: Boolean(ocrResult?.rawText || ocrResult?.details?.ocrDetected),
      ocrTextLength: ocrResult?.rawText ? ocrResult.rawText.length : (ocrResult?.details?.ocrTextLength || 0),
      textAbuseSource: ocrResult?.source || ocrResult?.details?.textAbuseSource || null,
      confidenceBreakdown
    }
  };
}

function floatRound(num, decimals = 4) {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

module.exports = {
  finalImageModerationDecision,
  aggregateConfidence,
  DEFAULT_DECISION_CONFIG
};
