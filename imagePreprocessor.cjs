/**
 * Image Preprocessing Module (Part 2 - Preprocessing & Numerical Pixel/Tensor Conversion)
 * 
 * Responsibilities:
 * 1. Safely decode base64 / binary image data (with integrity & dimension bounds checks)
 * 2. Convert to standard RGB pixel matrix (stripping alpha/transparency channel)
 * 3. Resize to model-compatible dimensions (configurable, default 224x224)
 * 4. Normalize pixel values (configurable mean, std, scaling)
 * 5. Convert to standardized numerical tensor representation (Float32Array in BCHW / HWC layout)
 * 6. Return ML-ready representation for future Computer Vision model (Part 3)
 */

const { Jimp } = require('jimp');
const {
  inspectAndValidateImage,
  SECURITY_CONFIG,
  ImageSecurityError
} = require('./imageSecurityValidator.cjs');

const DEFAULT_CONFIG = {
  // Model input dimensions
  targetWidth: 224,
  targetHeight: 224,

  // Channel format: 'RGB' or 'BGR'
  channelOrder: 'RGB',

  // Scaling factor: 1.0 / 255.0 to map [0, 255] -> [0.0, 1.0]
  scale: 1.0 / 255.0,

  // Normalization parameters (default: ImageNet statistics commonly used by ViT / ResNet / MobileNet)
  applyNormalization: true,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],

  // Tensor layout: 'BCHW' (Batch x Channels x Height x Width), 'CHW', or 'HWC' (Height x Width x Channels)
  tensorLayout: 'BCHW',

  // Security bounds
  maxPayloadBytes: (SECURITY_CONFIG.maxSizeMb || 10) * 1024 * 1024,
  maxDimension: SECURITY_CONFIG.maxWidth || 4096
};

/**
 * Preprocesses an image into a standardized numerical pixel tensor.
 * 
 * @param {string|Buffer} imageInput - Base64 data URL, raw base64 string, or Buffer
 * @param {Object} [customConfig] - Optional override configuration
 * @returns {Promise<Object>} ML-ready tensor representation with metadata
 */
async function preprocessImage(imageInput, customConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  // 1. Part 8 Security Validation & Safe Decoding
  const validated = await inspectAndValidateImage(imageInput, {
    maxSizeMb: config.maxPayloadBytes ? (config.maxPayloadBytes / (1024 * 1024)) : SECURITY_CONFIG.maxSizeMb,
    maxWidth: config.maxDimension || SECURITY_CONFIG.maxWidth,
    maxHeight: config.maxDimension || SECURITY_CONFIG.maxHeight,
    ...customConfig
  });

  let jimpImage = validated.jimpImage;
  let imageBuffer = validated.buffer;
  const origWidth = validated.width;
  const origHeight = validated.height;

  // Single-pass OCR buffer optimization:
  // Downsample oversized images (>1200px) for OCR to avoid Tesseract CPU lag while preserving readability.
  // If <= 1200px, directly reuse the validated buffer without re-encoding.
  let ocrBuffer = imageBuffer;
  if (origWidth > 1200 || origHeight > 1200) {
    try {
      const ocrClone = jimpImage.clone();
      const maxOcrDim = 1200;
      if (origWidth >= origHeight) {
        ocrClone.resize({ w: maxOcrDim });
      } else {
        ocrClone.resize({ h: maxOcrDim });
      }
      ocrBuffer = await ocrClone.getBuffer('image/jpeg');
    } catch (_) {
      ocrBuffer = imageBuffer;
    }
  }

  // 3. Resize to Model-Compatible Dimensions
  const targetW = config.targetWidth;
  const targetH = config.targetHeight;

  try {
    jimpImage.resize({ w: targetW, h: targetH });
  } catch (resizeErr) {
    throw new Error(`Failed to resize image to ${targetW}x${targetH}: ${resizeErr.message}`);
  }

  const rawData = jimpImage.bitmap.data; // RGBA Uint8Array / Buffer
  const pixelCount = targetW * targetH;

  // 4. Normalize & Convert to Numerical Tensor Representation
  const { channelOrder, scale, applyNormalization, mean, std, tensorLayout } = config;
  const isBGR = (channelOrder || '').toUpperCase() === 'BGR';

  let tensor;
  let shape;

  if (tensorLayout === 'BCHW') {
    // Layout: [Batch=1, Channels=3, Height, Width]
    shape = [1, 3, targetH, targetW];
    tensor = new Float32Array(3 * pixelCount);

    const channelOffset0 = 0 * pixelCount; // Red (or Blue if BGR)
    const channelOffset1 = 1 * pixelCount; // Green
    const channelOffset2 = 2 * pixelCount; // Blue (or Red if BGR)

    const mean0 = applyNormalization && mean ? mean[0] : 0;
    const mean1 = applyNormalization && mean ? mean[1] : 0;
    const mean2 = applyNormalization && mean ? mean[2] : 0;

    const std0 = applyNormalization && std ? std[0] : 1;
    const std1 = applyNormalization && std ? std[1] : 1;
    const std2 = applyNormalization && std ? std[2] : 1;

    for (let i = 0; i < pixelCount; i++) {
      const byteIdx = i * 4;
      const r = rawData[byteIdx];
      const g = rawData[byteIdx + 1];
      const b = rawData[byteIdx + 2];

      const val0 = isBGR ? b : r;
      const val1 = g;
      const val2 = isBGR ? r : b;

      const norm0 = applyNormalization ? ((val0 * scale) - mean0) / std0 : (val0 * scale);
      const norm1 = applyNormalization ? ((val1 * scale) - mean1) / std1 : (val1 * scale);
      const norm2 = applyNormalization ? ((val2 * scale) - mean2) / std2 : (val2 * scale);

      tensor[channelOffset0 + i] = norm0;
      tensor[channelOffset1 + i] = norm1;
      tensor[channelOffset2 + i] = norm2;
    }
  } else if (tensorLayout === 'CHW') {
    // Layout: [Channels=3, Height, Width]
    shape = [3, targetH, targetW];
    tensor = new Float32Array(3 * pixelCount);

    const channelOffset0 = 0 * pixelCount;
    const channelOffset1 = 1 * pixelCount;
    const channelOffset2 = 2 * pixelCount;

    const mean0 = applyNormalization && mean ? mean[0] : 0;
    const mean1 = applyNormalization && mean ? mean[1] : 0;
    const mean2 = applyNormalization && mean ? mean[2] : 0;

    const std0 = applyNormalization && std ? std[0] : 1;
    const std1 = applyNormalization && std ? std[1] : 1;
    const std2 = applyNormalization && std ? std[2] : 1;

    for (let i = 0; i < pixelCount; i++) {
      const byteIdx = i * 4;
      const r = rawData[byteIdx];
      const g = rawData[byteIdx + 1];
      const b = rawData[byteIdx + 2];

      const val0 = isBGR ? b : r;
      const val1 = g;
      const val2 = isBGR ? r : b;

      tensor[channelOffset0 + i] = applyNormalization ? ((val0 * scale) - mean0) / std0 : (val0 * scale);
      tensor[channelOffset1 + i] = applyNormalization ? ((val1 * scale) - mean1) / std1 : (val1 * scale);
      tensor[channelOffset2 + i] = applyNormalization ? ((val2 * scale) - mean2) / std2 : (val2 * scale);
    }
  } else {
    // Layout: [Height, Width, Channels=3] (HWC) or [1, Height, Width, 3] (BHWC)
    const isBatched = tensorLayout === 'BHWC';
    shape = isBatched ? [1, targetH, targetW, 3] : [targetH, targetW, 3];
    tensor = new Float32Array(pixelCount * 3);

    const meanR = applyNormalization && mean ? mean[0] : 0;
    const meanG = applyNormalization && mean ? mean[1] : 0;
    const meanB = applyNormalization && mean ? mean[2] : 0;

    const stdR = applyNormalization && std ? std[0] : 1;
    const stdG = applyNormalization && std ? std[1] : 1;
    const stdB = applyNormalization && std ? std[2] : 1;

    for (let i = 0; i < pixelCount; i++) {
      const byteIdx = i * 4;
      const r = rawData[byteIdx];
      const g = rawData[byteIdx + 1];
      const b = rawData[byteIdx + 2];

      const outIdx = i * 3;
      const val0 = isBGR ? b : r;
      const val1 = g;
      const val2 = isBGR ? r : b;

      tensor[outIdx] = applyNormalization ? ((val0 * scale) - (isBGR ? meanB : meanR)) / (isBGR ? stdB : stdR) : (val0 * scale);
      tensor[outIdx + 1] = applyNormalization ? ((val1 * scale) - meanG) / stdG : (val1 * scale);
      tensor[outIdx + 2] = applyNormalization ? ((val2 * scale) - (isBGR ? meanR : meanB)) / (isBGR ? stdR : stdB) : (val2 * scale);
    }
  }

  // 5. Explicit Cleanup to free memory
  jimpImage = null;
  imageBuffer = null;

  return {
    tensor,
    shape,
    layout: config.tensorLayout,
    dtype: 'float32',
    totalElements: tensor.length,
    ocrBuffer,
    format: validated.format,
    metadata: {
      originalWidth: origWidth,
      originalHeight: origHeight,
      targetWidth: targetW,
      targetHeight: targetH,
      channelOrder: config.channelOrder,
      normalized: !!config.applyNormalization
    }
  };
}

module.exports = {
  preprocessImage,
  DEFAULT_CONFIG,
  inspectAndValidateImage,
  SECURITY_CONFIG,
  ImageSecurityError
};
