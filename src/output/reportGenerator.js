const chalk = require('chalk');
const { logger } = require('./logger');

function generateReport(data) {
  const {
    originalSize,
    compressedSize,
    inputFile,
    outputFile,
    compressionLevel,
    processingTime
  } = data;

  const savedBytes = originalSize - compressedSize;
  const compressionRatio = ((1 - (compressedSize / originalSize)) * 100).toFixed(2);

  const report = `
${chalk.bold.cyan('Compression Report')}
${chalk.gray('═'.repeat(50))}

${chalk.bold('Input:')}     ${inputFile}
${chalk.bold('Output:')}    ${outputFile}
${chalk.bold('Level:')}     ${compressionLevel}

${chalk.bold('File Sizes:')}
  Original:   ${chalk.yellow(logger.formatBytes(originalSize))}
  Compressed: ${chalk.green(logger.formatBytes(compressedSize))}
  Saved:      ${chalk.green(logger.formatBytes(savedBytes))}

${chalk.bold('Statistics:')}
  Compression: ${chalk.green(compressionRatio + '%')}
  Time:        ${processingTime.toFixed(2)}s

${chalk.gray('═'.repeat(50))}
`;

  return report;
}

module.exports = { generateReport };
