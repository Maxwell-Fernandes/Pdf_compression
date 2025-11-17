const { compressPDF } = require('./src/controllers/compressionController');

async function test() {
  try {
    console.log('Testing PDF compression...\n');

    const config = {
      inputFile: './expt2.pdf',
      outputFile: './test_new_compressed.pdf',
      compressionLevel: 'extreme'
    };

    console.log(`Input: ${config.inputFile}`);
    console.log(`Output: ${config.outputFile}`);
    console.log(`Level: ${config.compressionLevel}\n`);

    const result = await compressPDF(config);

    console.log('\n=== Compression Complete ===');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
