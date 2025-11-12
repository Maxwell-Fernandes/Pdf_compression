const fs = require('fs');
const path = require('path');

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format percentage
 */
function formatPercentage(value) {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Calculate compression ratio
 */
function calculateCompressionRatio(originalSize, compressedSize) {
  if (originalSize === 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
}

/**
 * Ensure directory exists, create if not
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get file extension
 */
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Generate output filename
 */
function generateOutputFilename(inputPath, suffix = '_compressed') {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
}

/**
 * Check if file is a PDF
 */
function isPDF(filePath) {
  return getFileExtension(filePath) === '.pdf';
}

/**
 * Get file size
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Create temporary directory
 */
function createTempDir(prefix = 'pdf-compress-') {
  const tempDir = path.join(require('os').tmpdir(), prefix + Date.now());
  ensureDirectory(tempDir);
  return tempDir;
}

/**
 * Clean up temporary directory
 */
function cleanupTempDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`Warning: Failed to cleanup temp directory: ${error.message}`);
  }
}

/**
 * Sanitize file path (prevent path traversal)
 */
function sanitizePath(filePath) {
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(normalized);

  // Check for path traversal attempts
  if (normalized.includes('..')) {
    throw new Error('Invalid file path: path traversal detected');
  }

  return resolved;
}

/**
 * Get timestamp string
 */
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Retry async function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate compression level
 */
function isValidCompressionLevel(level) {
  const validLevels = ['extreme', 'medium', 'less'];
  return validLevels.includes(level?.toLowerCase());
}

/**
 * Merge objects deeply
 */
function deepMerge(target, source) {
  const output = Object.assign({}, target);

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Check if value is an object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

module.exports = {
  formatBytes,
  formatPercentage,
  calculateCompressionRatio,
  ensureDirectory,
  getFileExtension,
  generateOutputFilename,
  isPDF,
  getFileSize,
  createTempDir,
  cleanupTempDir,
  sanitizePath,
  getTimestamp,
  retryWithBackoff,
  sleep,
  isValidCompressionLevel,
  deepMerge,
  isObject
};
