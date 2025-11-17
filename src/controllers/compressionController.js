const ora = require('ora');
const fs = require('fs');
const chalk = require('chalk');
const { COMPRESSION_LEVELS } = require('../utils/constants');
const { processPDF } = require('../processors/pdfProcessor');
const { preScanPDF } = require('../processors/pdfPreScan');
const { logger } = require('../output/logger');
const { generateReport } = require('../output/reportGenerator');

async function compressPDF(config) {
  const { inputFile, compressionLevel, outputFile, force = false, skipPreScan = false } = config;

  // Validate compression level
  if (!COMPRESSION_LEVELS[compressionLevel]) {
    throw new Error(`Invalid compression level: ${compressionLevel}`);
  }

  const settings = COMPRESSION_LEVELS[compressionLevel];

  // Get original file size
  const originalSize = fs.statSync(inputFile).size;

  const spinner = ora({
    text: 'Initializing compression...',
    color: 'cyan'
  }).start();

  try {
    // Pre-scan PDF to estimate compression potential (unless skipped)
    if (!skipPreScan && !force) {
      spinner.text = 'Analyzing PDF...';
      const scanResults = await preScanPDF(inputFile);

      if (scanResults.isAlreadyOptimized) {
        spinner.warn('PDF appears already optimized');
        console.log('');
        console.log(chalk.yellow('═'.repeat(60)));
        console.log(chalk.yellow.bold('  Pre-Scan Analysis'));
        console.log(chalk.yellow('═'.repeat(60)));
        console.log(chalk.yellow(scanResults.recommendation.replace(/\\n/g, '\n')));
        console.log(chalk.yellow('═'.repeat(60)));
        console.log('');
        console.log(chalk.gray('Use --force to compress anyway (not recommended)'));
        console.log('');

        // Don't throw error, just exit gracefully
        return {
          success: false,
          skipped: true,
          reason: 'PDF already optimized',
          scanResults
        };
      } else if (parseFloat(scanResults.estimatedSavingsPercent) > 0) {
        spinner.info(`Estimated compression: ~${scanResults.estimatedSavingsPercent}%`);
      }
    }

    // Update spinner
    spinner.text = `Compressing PDF with ${settings.name} level...`;

    // Process the PDF
    const result = await processPDF(inputFile, outputFile, settings);

    spinner.succeed('PDF compression completed');

    // Get compressed file size
    const compressedSize = fs.statSync(outputFile).size;

    // Generate and display report
    const report = generateReport({
      originalSize,
      compressedSize,
      inputFile,
      outputFile,
      compressionLevel: settings.name,
      processingTime: result.processingTime,
      pageCount: result.pageCount,
      imageStats: result.imageStats,
      streamStats: result.streamStats,
      fontStats: result.fontStats,
      metadataStats: result.metadataStats
    });

    console.log(report);

    return {
      success: true,
      originalSize,
      compressedSize,
      compressionRatio: (compressedSize / originalSize)
    };
  } catch (error) {
    spinner.fail('Compression failed');
    throw error;
  }
}

module.exports = { compressPDF };
