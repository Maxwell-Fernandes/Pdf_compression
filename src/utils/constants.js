const COMPRESSION_LEVELS = {
  extreme: {
    name: 'Extreme',
    imageQuality: 40,
    imageDPI: 72,
    imageFormat: 'jpeg', // JPEG for maximum compatibility (WebP may not be supported by pdf-lib)
    removeMetadata: true,
    fontSubsetting: true,
    objectCompression: 'maximum',
    calculateQualityMetrics: false, // Disabled by default for performance
    description: 'Maximum compression - smallest file size'
  },
  medium: {
    name: 'Medium',
    imageQuality: 70,
    imageDPI: 150,
    imageFormat: 'jpeg',
    removeMetadata: 'partial',
    fontSubsetting: true,
    objectCompression: 'moderate',
    calculateQualityMetrics: false,
    description: 'Balanced compression - good size/quality ratio'
  },
  less: {
    name: 'Less',
    imageQuality: 85,
    imageDPI: 300,
    imageFormat: 'jpeg',
    removeMetadata: false,
    fontSubsetting: false,
    objectCompression: 'minimal',
    calculateQualityMetrics: false,
    description: 'Minimal compression - preserves quality'
  }
};

const ERROR_MESSAGES = {
  FILE_NOT_FOUND: 'The specified file was not found',
  INVALID_PDF: 'The file is not a valid PDF',
  PERMISSION_DENIED: 'Permission denied to read or write file',
  INVALID_COMPRESSION_LEVEL: 'Invalid compression level specified',
  COMPRESSION_FAILED: 'PDF compression failed',
  WRITE_FAILED: 'Failed to write output file'
};

module.exports = {
  COMPRESSION_LEVELS,
  ERROR_MESSAGES
};
