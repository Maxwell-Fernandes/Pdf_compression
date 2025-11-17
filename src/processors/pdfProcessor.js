const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { compressImages } = require('./imageCompressor');
const { optimizeStreams, deduplicateObjects, removeUnusedObjects } = require('./streamOptimizer');
const { subsetFonts } = require('./fontSubsetter');
const { stripMetadata } = require('./metadataStripper');
const { logger } = require('../output/logger');

async function processPDF(inputPath, outputPath, settings) {
  const startTime = Date.now();

  try {
    // Read the input PDF
    const existingPdfBytes = fs.readFileSync(inputPath);

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(existingPdfBytes, {
      ignoreEncryption: true
    });

    // Get document info
    const pageCount = pdfDoc.getPageCount();
    console.log(`  Pages: ${pageCount}`);

    // Apply compression settings based on level
    const compressionStats = await applyCompression(pdfDoc, settings);

    // Save the compressed PDF
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: settings.objectCompression !== 'minimal',
      addDefaultPage: false,
      objectsPerTick: settings.objectCompression === 'maximum' ? 50 : 500
    });

    // Write to output file
    fs.writeFileSync(outputPath, pdfBytes);

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    return {
      success: true,
      processingTime,
      pageCount,
      ...compressionStats
    };
  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

async function applyCompression(pdfDoc, settings) {
  const stats = {
    imageStats: null,
    streamStats: null,
    fontStats: null,
    metadataStats: null
  };

  try {
    // Step 1: Strip metadata
    logger.debug('Stripping metadata...');
    stats.metadataStats = await stripMetadata(pdfDoc, settings);

    // Step 2: Compress images
    logger.debug('Compressing images...');
    stats.imageStats = await compressImages(pdfDoc, settings);

    // Step 3: Optimize streams
    logger.debug('Optimizing streams...');
    stats.streamStats = await optimizeStreams(pdfDoc, settings);

    // Step 4: Subset fonts
    logger.debug('Subsetting fonts...');
    stats.fontStats = await subsetFonts(pdfDoc, settings);

    // Step 5: Advanced optimizations (disabled - need safer implementation)
    // Object deduplication and unused object removal can break PDFs if not done carefully
    // TODO: Implement safer deduplication that preserves PDF structure integrity
    if (false && settings.objectCompression === 'maximum') {
      logger.debug('Deduplicating objects...');
      const dedupeStats = await deduplicateObjects(pdfDoc);
      stats.deduplicationStats = dedupeStats;

      logger.debug('Removing unused objects...');
      const unusedStats = await removeUnusedObjects(pdfDoc);
      stats.unusedObjectStats = unusedStats;
    }

    return stats;
  } catch (error) {
    throw new Error(`Compression application failed: ${error.message}`);
  }
}

module.exports = { processPDF };
