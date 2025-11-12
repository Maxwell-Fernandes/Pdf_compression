const chalk = require('chalk');
const { logger } = require('./logger');

function generateReport(data) {
  const {
    originalSize,
    compressedSize,
    inputFile,
    outputFile,
    compressionLevel,
    processingTime,
    pageCount,
    imageStats,
    streamStats,
    fontStats,
    metadataStats
  } = data;

  const savedBytes = originalSize - compressedSize;
  const compressionRatio = ((1 - (compressedSize / originalSize)) * 100).toFixed(2);

  let report = `
${chalk.bold.cyan('Compression Report')}
${chalk.gray('═'.repeat(50))}

${chalk.bold('Input:')}     ${inputFile}
${chalk.bold('Output:')}    ${outputFile}
${chalk.bold('Level:')}     ${compressionLevel}
${chalk.bold('Pages:')}     ${pageCount || 'N/A'}

${chalk.bold('File Sizes:')}
  Original:   ${chalk.yellow(logger.formatBytes(originalSize))}
  Compressed: ${chalk.green(logger.formatBytes(compressedSize))}
  Saved:      ${chalk.green(logger.formatBytes(savedBytes))}

${chalk.bold('Overall Statistics:')}
  Compression: ${chalk.green(compressionRatio + '%')}
  Time:        ${processingTime.toFixed(2)}s
`;

  // Add detailed statistics if available
  if (imageStats || streamStats || fontStats || metadataStats) {
    report += `\n${chalk.bold('Optimization Details:')}`;

    if (imageStats && imageStats.imagesProcessed > 0) {
      report += `\n  ${chalk.cyan('Images:')} ${imageStats.imagesProcessed} processed`;
    }

    if (streamStats && streamStats.streamsProcessed > 0) {
      report += `\n  ${chalk.cyan('Streams:')} ${streamStats.streamsProcessed} optimized`;
    }

    if (fontStats && fontStats.fontsProcessed > 0) {
      report += `\n  ${chalk.cyan('Fonts:')} ${fontStats.fontsProcessed} processed`;
      if (fontStats.glyphsRemoved > 0) {
        report += ` (${fontStats.glyphsRemoved} glyphs removed)`;
      }
    }

    if (metadataStats && metadataStats.metadataRemoved > 0) {
      report += `\n  ${chalk.cyan('Metadata:')} ${metadataStats.fieldsCleared} fields cleared`;
    }
  }

  report += `\n${chalk.gray('═'.repeat(50))}\n`;

  return report;
}

module.exports = { generateReport };
