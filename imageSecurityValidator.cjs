/**
 * Image Security Validation Module (Part 8 - Secure Image Upload Handling)
 * 
 * Responsibilities:
 * 1. Inspect real file contents via Magic Bytes / Signatures (reject fake extensions / disguised executables / PDFs / HTML / ZIPs).
 * 2. Enforce configurable file size limits (default: 10MB) before parsing or passing to AI models.
 * 3. Enforce configurable dimension bounds & decompression-bomb protection (default: 4096x4096px / 16.7M pixels).
 * 4. Safe image decoding & corrupted image rejection without server crashes.
 * 5. Malicious file protection & path traversal prevention (client filenames are never trusted or executed).
 * 6. Controlled safe user-facing error messages without exposing technical stack traces or internal paths.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Jimp } = require('jimp');

// Configurable Security Bounds
const SECURITY_CONFIG = {
  maxSizeMb: parseFloat(process.env.MAX_IMAGE_SIZE_MB || '10'),
  maxWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '4096', 10),
  maxHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '4096', 10),
  maxPixels: parseInt(process.env.MAX_IMAGE_PIXELS || `${4096 * 4096}`, 10),
  allowedTypes: (process.env.ALLOWED_IMAGE_TYPES || 'jpeg,jpg,png,webp')
    .toLowerCase()
    .split(',')
    .map(t => t.trim())
};

class ImageSecurityError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = 'ImageSecurityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Detects actual image format by inspecting file Magic Bytes / binary signatures.
 * 
 * @param {Buffer} buffer - Binary buffer of the uploaded file
 * @returns {string|null} Detected image type ('jpeg', 'png', 'webp') or null if invalid/unsupported
 */
function detectImageFormatFromMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // 1. JPEG / JPG: Starts with FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpeg';
  }

  // 2. PNG: Starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'png';
  }

  // 3. WEBP: RIFF header (offset 0..3) + WEBP identifier (offset 8..11)
  // RIFF = 0x52 0x49 0x46 0x46, WEBP = 0x57 0x45 0x42 0x50
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  // Explicitly reject known dangerous / non-image signatures
  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  // Executable / DLL: MZ (0x4D 0x5A)
  // ZIP / JAR / APK: PK\x03\x04 (0x50 0x4B 0x03 0x04)
  // HTML / XML / SVG: Starts with '<'
  return null;
}

/**
 * Extracts binary buffer from Base64 or Buffer input with strict size validation.
 * 
 * @param {string|Buffer} imageInput - Raw base64 data URL, plain base64, or Buffer
 * @param {Object} [customConfig] - Optional override configuration
 * @returns {Buffer} Validated binary buffer
 */
function extractAndValidateBuffer(imageInput, customConfig = {}) {
  const cfg = { ...SECURITY_CONFIG, ...customConfig };
  const maxBytes = cfg.maxSizeMb * 1024 * 1024;

  if (!imageInput) {
    throw new ImageSecurityError('Image input is empty.', 'EMPTY_IMAGE', 400);
  }

  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string') {
    const trimmed = imageInput.trim();
    if (!trimmed) {
      throw new ImageSecurityError('Image input string is empty.', 'EMPTY_IMAGE', 400);
    }

    // Strip Data URL prefix if present (e.g. data:image/png;base64,...)
    const base64Data = trimmed.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    // Quick estimation before memory allocation (base64 length * 0.75)
    const estimatedBytes = Math.ceil(base64Data.length * 0.75);
    if (estimatedBytes > maxBytes) {
      throw new ImageSecurityError('Image is too large. Please choose a smaller image.', 'IMAGE_TOO_LARGE', 400);
    }

    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch (b64Err) {
      throw new ImageSecurityError('Invalid or corrupted image data.', 'CORRUPTED_IMAGE', 400);
    }
  } else {
    throw new ImageSecurityError('Unsupported image payload type.', 'INVALID_INPUT_TYPE', 400);
  }

  // Exact binary size check
  if (!buffer || buffer.length === 0) {
    throw new ImageSecurityError('Image buffer is empty.', 'EMPTY_IMAGE', 400);
  }

  if (buffer.length > maxBytes) {
    throw new ImageSecurityError('Image is too large. Please choose a smaller image.', 'IMAGE_TOO_LARGE', 400);
  }

  return buffer;
}

/**
 * Performs complete security inspection, magic byte verification, safe decoding,
 * and dimension/decompression-bomb validation.
 * 
 * @param {string|Buffer} imageInput - Raw base64, data URL, or Buffer
 * @param {Object} [customConfig] - Optional security overrides
 * @returns {Promise<Object>} Safe decoded image object, buffer, and metadata
 */
async function inspectAndValidateImage(imageInput, customConfig = {}) {
  const cfg = { ...SECURITY_CONFIG, ...customConfig };

  // 1. Size & Buffer Extraction
  const buffer = extractAndValidateBuffer(imageInput, cfg);

  // 2. Real Magic Byte Verification (Do not trust client MIME type or extension)
  const realFormat = detectImageFormatFromMagicBytes(buffer);
  if (!realFormat) {
    throw new ImageSecurityError('Unsupported image format. Please upload a valid JPEG, PNG, or WEBP image.', 'UNSUPPORTED_FORMAT', 400);
  }

  const isAllowed = cfg.allowedTypes.includes(realFormat) ||
    (realFormat === 'jpeg' && cfg.allowedTypes.includes('jpg'));

  if (!isAllowed) {
    throw new ImageSecurityError('Unsupported image format.', 'UNSUPPORTED_FORMAT', 400);
  }

  // 3. Safe Decoding & Corrupted Image Protection
  let jimpImage;
  try {
    jimpImage = await Jimp.read(buffer);
  } catch (decodeErr) {
    throw new ImageSecurityError('Invalid or corrupted image. Please choose another image.', 'CORRUPTED_IMAGE', 400);
  }

  if (!jimpImage || !jimpImage.bitmap || !jimpImage.bitmap.width || !jimpImage.bitmap.height) {
    throw new ImageSecurityError('Invalid or corrupted image bitmap.', 'CORRUPTED_IMAGE', 400);
  }

  const width = jimpImage.bitmap.width;
  const height = jimpImage.bitmap.height;
  const totalPixels = width * height;

  // 4. Dimension & Decompression Bomb Bounds
  if (width > cfg.maxWidth || height > cfg.maxHeight) {
    throw new ImageSecurityError('Image dimensions exceed allowable limit. Please choose a smaller image.', 'DIMENSIONS_EXCEEDED', 400);
  }

  if (totalPixels > cfg.maxPixels) {
    throw new ImageSecurityError('Image pixel count exceeds allowable limit.', 'DECOMPRESSION_BOMB_DETECTED', 400);
  }

  return {
    buffer,
    jimpImage,
    format: realFormat,
    width,
    height,
    totalPixels,
    sizeBytes: buffer.length
  };
}

/**
 * Creates a safe, isolated temporary file in a controlled directory with automatic cleanup.
 * 
 * @param {Buffer} buffer - Data to write
 * @returns {Promise<{filePath: string, cleanup: Function}>} Temporary file path and cleanup callback
 */
async function createSecureTempFile(buffer) {
  const tempDir = path.join(os.tmpdir(), 'safeconnect_temp_uploads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const randomName = `${crypto.randomBytes(16).toString('hex')}.tmp`;
  const filePath = path.join(tempDir, randomName);

  await fs.promises.writeFile(filePath, buffer);

  const cleanup = async () => {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (_) {
      // Ignore cleanup errors silently
    }
  };

  return { filePath, cleanup };
}

module.exports = {
  SECURITY_CONFIG,
  ImageSecurityError,
  detectImageFormatFromMagicBytes,
  extractAndValidateBuffer,
  inspectAndValidateImage,
  createSecureTempFile
};
