const fs = require('fs');
const path = require('path');

function validateFile(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        error: 'File does not exist'
      };
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return {
        valid: false,
        error: 'Path is not a file'
      };
    }

    // Check file extension
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return {
        valid: false,
        error: 'File must have .pdf extension'
      };
    }

    // Check file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (err) {
      return {
        valid: false,
        error: 'File is not readable (permission denied)'
      };
    }

    // Check file size (must be > 0)
    if (stats.size === 0) {
      return {
        valid: false,
        error: 'File is empty'
      };
    }

    // Check file size (warn if > 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (stats.size > maxSize) {
      console.warn(`Warning: File size is ${(stats.size / 1024 / 1024).toFixed(2)}MB. Processing may take longer.`);
    }

    // Validate PDF magic number
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    const magicNumber = buffer.toString('ascii');
    if (!magicNumber.startsWith('%PDF-')) {
      return {
        valid: false,
        error: 'File is not a valid PDF (invalid magic number)'
      };
    }

    return {
      valid: true,
      size: stats.size,
      path: path.resolve(filePath)
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${error.message}`
    };
  }
}

module.exports = { validateFile };
