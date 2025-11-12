const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');

async function promptForOptions() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'inputFile',
      message: 'Enter the path to your PDF file:',
      validate: (input) => {
        if (!input) {
          return 'Please enter a file path';
        }
        if (!fs.existsSync(input)) {
          return 'File does not exist. Please enter a valid path';
        }
        if (!input.toLowerCase().endsWith('.pdf')) {
          return 'File must be a PDF';
        }
        return true;
      },
      filter: (input) => {
        // Resolve relative paths to absolute paths
        return path.resolve(input);
      }
    },
    {
      type: 'list',
      name: 'compressionLevel',
      message: 'Select compression level:',
      choices: [
        {
          name: 'Extreme - Maximum compression (smaller file, lower quality)',
          value: 'extreme',
          short: 'Extreme'
        },
        {
          name: 'Medium - Balanced compression (good balance of size and quality)',
          value: 'medium',
          short: 'Medium'
        },
        {
          name: 'Less - Minimal compression (larger file, higher quality)',
          value: 'less',
          short: 'Less'
        }
      ],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'outputFile',
      message: 'Enter output file path (press Enter for default):',
      default: (answers) => {
        const parsed = path.parse(answers.inputFile);
        return path.join(parsed.dir, `${parsed.name}_compressed.pdf`);
      },
      validate: (input) => {
        if (!input) {
          return 'Please enter an output path';
        }
        if (!input.toLowerCase().endsWith('.pdf')) {
          return 'Output file must have .pdf extension';
        }
        const dir = path.dirname(input);
        if (!fs.existsSync(dir)) {
          return `Directory does not exist: ${dir}`;
        }
        return true;
      },
      filter: (input) => {
        return path.resolve(input);
      }
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with compression?',
      default: true
    }
  ]);

  if (!answers.confirm) {
    throw new Error('Compression cancelled by user');
  }

  return {
    inputFile: answers.inputFile,
    compressionLevel: answers.compressionLevel,
    outputFile: answers.outputFile
  };
}

module.exports = { promptForOptions };
