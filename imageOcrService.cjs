/**
 * Image OCR Service (Part 4 - Optical Character Recognition & Text Extraction)
 * 
 * Extracts visible text (English and Telugu script) from image buffers using a persistent
 * Tesseract OCR worker.
 */

const { createWorker } = require('tesseract.js');

let ocrWorker = null;
let ocrWorkerInitializing = null;

/**
 * Initializes and retrieves the singleton Tesseract OCR worker.
 * Loads 'eng+tel' language models once upon first access.
 */
async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;
  if (!ocrWorkerInitializing) {
    ocrWorkerInitializing = (async () => {
      try {
        console.log('[OCR SERVICE] Initializing multi-lingual OCR engine (English + Telugu)...');
        const worker = await createWorker('eng+tel');
        ocrWorker = worker;
        console.log('[OCR SERVICE] Multi-lingual OCR engine initialized and ready.');
        return worker;
      } catch (err) {
        console.error('[OCR SERVICE] Error initializing OCR engine:', err.message || err);
        ocrWorkerInitializing = null;
        throw err;
      }
    })();
  }
  return ocrWorkerInitializing;
}

/**
 * Extracts visible text from an image buffer or base64 string.
 * 
 * @param {string|Buffer} imageInput - Base64 data URL, string, or Buffer
 * @returns {Promise<string>} Cleaned extracted text (or empty string if none detected)
 */
async function extractTextFromImage(imageInput) {
  if (!imageInput) return '';

  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string') {
    const cleanB64 = imageInput.trim().replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    buffer = Buffer.from(cleanB64, 'base64');
  } else {
    return '';
  }

  try {
    const worker = await getOcrWorker();
    const result = await worker.recognize(buffer);
    buffer = null;
    const rawText = result && result.data && result.data.text ? result.data.text : '';
    
    // Normalize basic spacing and whitespace
    const cleanedText = rawText.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim();
    return cleanedText;
  } catch (err) {
    buffer = null;
    console.warn('[OCR SERVICE] OCR extraction warning:', err.message || err);
    throw err;
  }
}

module.exports = {
  getOcrWorker,
  extractTextFromImage
};
