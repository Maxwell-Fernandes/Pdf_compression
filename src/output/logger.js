const chalk = require('chalk');

class Logger {
  info(message) {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message) {
    console.log(chalk.green('✓'), message);
  }

  error(message) {
    console.error(chalk.red('✗'), message);
  }

  warn(message) {
    console.warn(chalk.yellow('⚠'), message);
  }

  debug(message) {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatPercentage(value) {
    return `${(value * 100).toFixed(2)}%`;
  }
}

const logger = new Logger();

module.exports = { logger };
