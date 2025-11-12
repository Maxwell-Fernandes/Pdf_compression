const fg = require('fast-glob');
const path = require('path');
const fs = require('fs');
const ora = require('ora');
const { compressPDF } = require('./compressionController');
const { logger } = require('../output/logger');
const { isPDF, generateOutputFilename, ensureDirectory } = require('../utils/helpers');

/**
 * Process multiple PDF files in batch
 * @param {Object} config - Batch processing configuration
 * @returns {Object} - Batch processing results
 */
async function processBatch(config) {
  const {
    inputPattern,
    compressionLevel,
    outputDir,
    recursive = false,
    overwrite = false
  } = config;

  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    files: [],
    totalOriginalSize: 0,
    totalCompressedSize: 0
  };

  try {
    // Find all matching PDF files
    const files = await findPDFFiles(inputPattern, recursive);

    if (files.length === 0) {
      logger.warn('No PDF files found matching the pattern');
      return results;
    }

    results.total = files.length;

    logger.info(`Found ${files.length} PDF file(s) to process\n`);

    // Ensure output directory exists
    if (outputDir) {
      ensureDirectory(outputDir);
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const inputFile = files[i];
      const fileResult = await processSingleFile(
        inputFile,
        compressionLevel,
        outputDir,
        overwrite,
        i + 1,
        files.length
      );

      results.files.push(fileResult);

      if (fileResult.success) {
        results.successful++;
        results.totalOriginalSize += fileResult.originalSize;
        results.totalCompressedSize += fileResult.compressedSize;
      } else {
        results.failed++;
      }
    }

    // Print summary
    printBatchSummary(results);

    return results;
  } catch (error) {
    throw new Error(`Batch processing failed: ${error.message}`);
  }
}

/**
 * Find PDF files matching pattern
 */
async function findPDFFiles(pattern, recursive) {
  try {
    // If pattern is a directory, search for all PDFs
    if (fs.existsSync(pattern) && fs.statSync(pattern).isDirectory()) {
      const searchPattern = recursive
        ? path.join(pattern, '**', '*.pdf')
        : path.join(pattern, '*.pdf');
      pattern = searchPattern;
    }

    // Use fast-glob to find files
    const files = await fg(pattern, {
      onlyFiles: true,
      absolute: true,
      caseSensitiveMatch: false
    });

    // Filter for PDF files only
    return files.filter(file => isPDF(file));
  } catch (error) {
    throw new Error(`Failed to find PDF files: ${error.message}`);
  }
}

/**
 * Process a single file in batch mode
 */
async function processSingleFile(
  inputFile,
  compressionLevel,
  outputDir,
  overwrite,
  current,
  total
) {
  const result = {
    inputFile,
    outputFile: null,
    success: false,
    error: null,
    originalSize: 0,
    compressedSize: 0
  };

  try {
    // Determine output file path
    let outputFile;
    if (outputDir) {
      const basename = path.basename(inputFile);
      outputFile = path.join(outputDir, basename);
    } else {
      outputFile = generateOutputFilename(inputFile);
    }

    // Check if output file exists
    if (!overwrite && fs.existsSync(outputFile)) {
      throw new Error('Output file already exists (use --overwrite to replace)');
    }

    result.outputFile = outputFile;

    // Get original size
    result.originalSize = fs.statSync(inputFile).size;

    // Compress the PDF
    logger.info(`[${current}/${total}] Processing: ${path.basename(inputFile)}`);

    const compressionResult = await compressPDF({
      inputFile,
      compressionLevel,
      outputFile
    });

    // Get compressed size
    result.compressedSize = fs.statSync(outputFile).size;
    result.success = true;

    // Show brief result
    const saved = result.originalSize - result.compressedSize;
    const ratio = ((saved / result.originalSize) * 100).toFixed(1);
    logger.success(`  Saved ${logger.formatBytes(saved)} (${ratio}%)\n`);

  } catch (error) {
    result.error = error.message;
    logger.error(`  Failed: ${error.message}\n`);
  }

  return result;
}

/**
 * Print batch processing summary
 */
function printBatchSummary(results) {
  const chalk = require('chalk');

  const totalSaved = results.totalOriginalSize - results.totalCompressedSize;
  const overallRatio = results.totalOriginalSize > 0
    ? ((totalSaved / results.totalOriginalSize) * 100).toFixed(2)
    : 0;

  console.log(chalk.bold.cyan('\nBatch Processing Summary'));
  console.log(chalk.gray('═'.repeat(50)));
  console.log(`${chalk.bold('Total files:')}     ${results.total}`);
  console.log(`${chalk.bold('Successful:')}     ${chalk.green(results.successful)}`);
  console.log(`${chalk.bold('Failed:')}         ${results.failed > 0 ? chalk.red(results.failed) : results.failed}`);
  console.log(`\n${chalk.bold('Original size:')}  ${logger.formatBytes(results.totalOriginalSize)}`);
  console.log(`${chalk.bold('Compressed:')}     ${logger.formatBytes(results.totalCompressedSize)}`);
  console.log(`${chalk.bold('Total saved:')}    ${chalk.green(logger.formatBytes(totalSaved))}`);
  console.log(`${chalk.bold('Compression:')}    ${chalk.green(overallRatio + '%')}`);
  console.log(chalk.gray('═'.repeat(50)));

  // List failed files if any
  if (results.failed > 0) {
    console.log(chalk.red.bold('\nFailed files:'));
    results.files
      .filter(f => !f.success)
      .forEach(f => {
        console.log(`  ${chalk.red('✗')} ${f.inputFile}`);
        console.log(`    ${chalk.gray(f.error)}`);
      });
  }
}

/**
 * Validate batch configuration
 */
function validateBatchConfig(config) {
  if (!config.inputPattern) {
    throw new Error('Input pattern is required for batch processing');
  }

  if (!config.compressionLevel) {
    throw new Error('Compression level is required');
  }

  // Check if input pattern exists
  if (!config.inputPattern.includes('*')) {
    // Not a glob pattern, check if path exists
    if (!fs.existsSync(config.inputPattern)) {
      throw new Error(`Input path does not exist: ${config.inputPattern}`);
    }
  }
}

module.exports = {
  processBatch,
  findPDFFiles,
  processSingleFile,
  validateBatchConfig
};
