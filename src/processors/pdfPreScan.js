const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

/**
 * Pre-scan PDF to estimate compression potential
 * Implements "Performance and Efficiency" design principle from docs
 * @param {string} filePath - Path to PDF file
 * @returns {Object} - Pre-scan results with compression potential estimate
 */
async function preScanPDF(filePath) {
  try {
    const fileSize = fs.statSync(filePath).size;
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const context = pdfDoc.context;
    const indirectObjects = context.indirectObjects;

    const scanResults = {
      isAlreadyOptimized: false,
      estimatedSavings: 0,
      estimatedSavingsPercent: 0,
      indicators: {
        hasUncompressedImages: false,
        hasUncompressedStreams: false,
        hasLargeMetadata: false,
        hasUnsubsettedFonts: false,
        hasObjectStreams: false,
        compressionRatio: 0
      },
      recommendation: '',
      fileSize,
      pageCount: pdfDoc.getPageCount()
    };

    // Check for uncompressed images
    let imageCount = 0;
    let uncompressedImageCount = 0;
    let totalUncompressedImageSize = 0;

    // Check for uncompressed streams
    let streamCount = 0;
    let uncompressedStreamCount = 0;

    // Check for object streams (indicator of optimization)
    let hasObjectStreams = false;

    for (const [ref, object] of indirectObjects.entries()) {
      try {
        // Check if it's a stream object
        if (object && object.dict) {
          const subtype = object.dict.lookup(object.dict.context.obj('Subtype'));
          const filter = object.dict.lookup(object.dict.context.obj('Filter'));
          const filterName = filter?.toString() || '';

          // Check for images
          if (subtype && subtype.toString() === '/Image') {
            imageCount++;
            // If no compression filter or only basic compression
            if (!filter || filterName === '/FlateDecode') {
              uncompressedImageCount++;
              const contents = object.contents;
              if (contents && typeof contents === 'function') {
                try {
                  const data = contents();
                  totalUncompressedImageSize += data.length;
                } catch (e) {
                  // Ignore
                }
              }
            }
          }

          // Check for object streams
          if (subtype && subtype.toString() === '/ObjStm') {
            hasObjectStreams = true;
          }

          // Check for uncompressed content streams
          if (!filter && object.contents) {
            streamCount++;
            if (!filterName.includes('Flate') && !filterName.includes('DCT')) {
              uncompressedStreamCount++;
            }
          }
        }
      } catch (e) {
        // Skip errors
      }
    }

    // Analyze results
    scanResults.indicators.hasUncompressedImages = uncompressedImageCount > imageCount * 0.3;
    scanResults.indicators.hasUncompressedStreams = uncompressedStreamCount > 5;
    scanResults.indicators.hasObjectStreams = hasObjectStreams;

    // Estimate compression potential
    let estimatedSavings = 0;

    // Images: Can save 50-80% on uncompressed images
    if (totalUncompressedImageSize > 0) {
      estimatedSavings += totalUncompressedImageSize * 0.6;
    }

    // Streams: Can save 20-40% on uncompressed streams
    if (uncompressedStreamCount > 0) {
      estimatedSavings += (fileSize * 0.1) * (uncompressedStreamCount / Math.max(streamCount, 1));
    }

    // Object streams: If not present, can save 5-10%
    if (!hasObjectStreams) {
      estimatedSavings += fileSize * 0.05;
    }

    scanResults.estimatedSavings = Math.round(estimatedSavings);
    scanResults.estimatedSavingsPercent = ((estimatedSavings / fileSize) * 100).toFixed(2);

    // Determine if already optimized
    // A PDF is considered optimized if:
    // 1. Has object streams
    // 2. Less than 20% uncompressed images
    // 3. Less than 5 uncompressed streams
    // 4. Estimated savings < 5%
    const optimizationScore =
      (hasObjectStreams ? 1 : 0) +
      (uncompressedImageCount < imageCount * 0.2 ? 1 : 0) +
      (uncompressedStreamCount < 5 ? 1 : 0);

    scanResults.isAlreadyOptimized =
      optimizationScore >= 2 &&
      parseFloat(scanResults.estimatedSavingsPercent) < 5;

    // Generate recommendation
    if (scanResults.isAlreadyOptimized) {
      scanResults.recommendation =
        '⚠️  PDF appears already optimized by professional software.\\n' +
        `   Estimated savings: ${scanResults.estimatedSavingsPercent}% (${formatBytes(scanResults.estimatedSavings)})\\n` +
        '   Compression may INCREASE file size due to PDF library overhead.\\n' +
        '   Recommendation: Skip compression or use --force to proceed anyway.';
    } else if (parseFloat(scanResults.estimatedSavingsPercent) < 10) {
      scanResults.recommendation =
        `ℹ️  Moderate compression potential: ~${scanResults.estimatedSavingsPercent}% (${formatBytes(scanResults.estimatedSavings)})\\n` +
        '   Compression may provide minimal benefits.';
    } else {
      scanResults.recommendation =
        `✓  Good compression potential: ~${scanResults.estimatedSavingsPercent}% (${formatBytes(scanResults.estimatedSavings)})\\n` +
        '   Compression is likely to be effective.';
    }

    return scanResults;
  } catch (error) {
    throw new Error(`Pre-scan failed: ${error.message}`);
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  preScanPDF
};
