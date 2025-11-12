#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { promptForOptions } = require('./prompts');
const { compressPDF } = require('../controllers/compressionController');
const { validateFile } = require('../validators/fileValidator');
const { logger } = require('../output/logger');

async function main() {
  console.log(chalk.cyan.bold('\n📄 PDF Compression Tool\n'));

  program
    .name('pdf-compress')
    .description('Compress PDF files with configurable compression levels')
    .version('1.0.0')
    .option('-f, --file <path>', 'Input PDF file path')
    .option('-l, --level <level>', 'Compression level: extreme, medium, or less')
    .option('-o, --output <path>', 'Output PDF file path')
    .parse(process.argv);

  const options = program.opts();

  try {
    let config;

    // If no options provided, use interactive mode
    if (!options.file || !options.level) {
      logger.info('Starting interactive mode...\n');
      config = await promptForOptions();
    } else {
      // Use command-line arguments
      config = {
        inputFile: options.file,
        compressionLevel: options.level,
        outputFile: options.output || options.file.replace('.pdf', '_compressed.pdf')
      };
    }

    // Validate input file
    const validation = validateFile(config.inputFile);
    if (!validation.valid) {
      logger.error(`Validation failed: ${validation.error}`);
      process.exit(1);
    }

    // Display configuration
    logger.info('Compression Configuration:');
    logger.info(`  Input:  ${chalk.yellow(config.inputFile)}`);
    logger.info(`  Level:  ${chalk.yellow(config.compressionLevel)}`);
    logger.info(`  Output: ${chalk.yellow(config.outputFile)}\n`);

    // Perform compression
    await compressPDF(config);

    logger.success('\n✓ Compression completed successfully!');
  } catch (error) {
    logger.error(`\n✗ Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Run the CLI
main();
