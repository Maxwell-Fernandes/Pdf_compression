#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { promptForOptions } = require('./prompts');
const { compressPDF } = require('../controllers/compressionController');
const { processBatch, validateBatchConfig } = require('../controllers/batchProcessor');
const { validateFile } = require('../validators/fileValidator');
const { logger } = require('../output/logger');
const { isValidCompressionLevel } = require('../utils/helpers');

async function main() {
  console.log(chalk.cyan.bold('\n📄 PDF Compression Tool\n'));

  program
    .name('pdf-compress')
    .description('Compress PDF files with configurable compression levels')
    .version('1.0.0')
    .option('-f, --file <path>', 'Input PDF file path')
    .option('-l, --level <level>', 'Compression level: extreme, medium, or less')
    .option('-o, --output <path>', 'Output PDF file path')
    .option('-b, --batch <pattern>', 'Batch process multiple files (glob pattern or directory)')
    .option('-d, --output-dir <dir>', 'Output directory for batch processing')
    .option('-r, --recursive', 'Recursively search for PDFs in subdirectories')
    .option('--overwrite', 'Overwrite existing output files')
    .parse(process.argv);

  const options = program.opts();

  try {
    // Check if batch mode
    if (options.batch) {
      await runBatchMode(options);
    } else if (!options.file || !options.level) {
      // Interactive mode
      await runInteractiveMode();
    } else {
      // Single file mode
      await runSingleFileMode(options);
    }

    logger.success('\n✓ Operation completed successfully!');
  } catch (error) {
    logger.error(`\n✗ Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

async function runInteractiveMode() {
  logger.info('Starting interactive mode...\n');
  const config = await promptForOptions();

  // Validate input file
  const validation = validateFile(config.inputFile);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Display configuration
  logger.info('Compression Configuration:');
  logger.info(`  Input:  ${chalk.yellow(config.inputFile)}`);
  logger.info(`  Level:  ${chalk.yellow(config.compressionLevel)}`);
  logger.info(`  Output: ${chalk.yellow(config.outputFile)}\n`);

  // Perform compression
  await compressPDF(config);
}

async function runSingleFileMode(options) {
  const config = {
    inputFile: options.file,
    compressionLevel: options.level.toLowerCase(),
    outputFile: options.output || options.file.replace('.pdf', '_compressed.pdf')
  };

  // Validate compression level
  if (!isValidCompressionLevel(config.compressionLevel)) {
    throw new Error(`Invalid compression level: ${config.compressionLevel}. Use: extreme, medium, or less`);
  }

  // Validate input file
  const validation = validateFile(config.inputFile);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Display configuration
  logger.info('Compression Configuration:');
  logger.info(`  Input:  ${chalk.yellow(config.inputFile)}`);
  logger.info(`  Level:  ${chalk.yellow(config.compressionLevel)}`);
  logger.info(`  Output: ${chalk.yellow(config.outputFile)}\n`);

  // Perform compression
  await compressPDF(config);
}

async function runBatchMode(options) {
  if (!options.level) {
    throw new Error('Compression level (-l, --level) is required for batch processing');
  }

  const config = {
    inputPattern: options.batch,
    compressionLevel: options.level.toLowerCase(),
    outputDir: options.outputDir,
    recursive: options.recursive || false,
    overwrite: options.overwrite || false
  };

  // Validate compression level
  if (!isValidCompressionLevel(config.compressionLevel)) {
    throw new Error(`Invalid compression level: ${config.compressionLevel}. Use: extreme, medium, or less`);
  }

  // Validate batch config
  validateBatchConfig(config);

  // Display configuration
  logger.info('Batch Processing Configuration:');
  logger.info(`  Pattern:   ${chalk.yellow(config.inputPattern)}`);
  logger.info(`  Level:     ${chalk.yellow(config.compressionLevel)}`);
  logger.info(`  Output:    ${chalk.yellow(config.outputDir || '(same directory)')}`);
  logger.info(`  Recursive: ${chalk.yellow(config.recursive ? 'Yes' : 'No')}`);
  logger.info(`  Overwrite: ${chalk.yellow(config.overwrite ? 'Yes' : 'No')}\n`);

  // Perform batch processing
  await processBatch(config);
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run the CLI
main();
