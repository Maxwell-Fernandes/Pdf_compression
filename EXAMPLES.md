# PDF Compression Tool - Usage Examples

Complete examples demonstrating how to use the PDF compression tool for various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Compression Levels](#compression-levels)
- [Batch Processing](#batch-processing)
- [Advanced Features](#advanced-features)
- [Quality Validation](#quality-validation)
- [Programmatic Usage](#programmatic-usage)

---

## Basic Usage

### Interactive Mode

The simplest way to use the tool:

```bash
npm start
```

You'll be prompted to:
1. Select a PDF file
2. Choose compression level (extreme/medium/less)
3. Specify output location (optional)

### Command-Line Mode

Compress a single PDF with specific settings:

```bash
# Basic compression with medium level
node src/cli/index.js -f document.pdf -l medium

# Specify custom output path
node src/cli/index.js -f input.pdf -l extreme -o compressed.pdf

# Minimal compression, preserving quality
node src/cli/index.js -f important.pdf -l less -o output.pdf
```

---

## Compression Levels

### Extreme Compression

**Best for:** Email attachments, web uploads, archival storage

```bash
node src/cli/index.js -f large-document.pdf -l extreme -o small.pdf
```

**Settings:**
- Image Quality: 40%
- Image DPI: 72
- Metadata: All removed
- Font Subsetting: Yes
- Stream Compression: Maximum

**Expected Results:**
- Scanned documents: 80-90% reduction
- Image-heavy PDFs: 70-85% reduction
- Text-heavy PDFs: 30-50% reduction

### Medium Compression

**Best for:** General document sharing, presentations

```bash
node src/cli/index.js -f presentation.pdf -l medium -o shared.pdf
```

**Settings:**
- Image Quality: 70%
- Image DPI: 150
- Metadata: Partial (keeps title/author)
- Font Subsetting: Yes
- Stream Compression: Moderate

**Expected Results:**
- Balanced quality and size
- 40-60% reduction typical
- Good readability maintained

### Less Compression

**Best for:** Professional printing, high-quality archival

```bash
node src/cli/index.js -f final-report.pdf -l less -o print-ready.pdf
```

**Settings:**
- Image Quality: 85%
- Image DPI: 300
- Metadata: Preserved
- Font Subsetting: No
- Stream Compression: Minimal

**Expected Results:**
- 20-30% reduction
- Near-original quality
- Suitable for printing

---

## Batch Processing

### Process All PDFs in a Directory

```bash
# Compress all PDFs in 'documents' folder
node src/cli/index.js -b documents/ -l medium -d compressed/

# With recursive subdirectory search
node src/cli/index.js -b documents/ -l extreme -d output/ -r
```

### Using Glob Patterns

```bash
# Compress only invoice PDFs
node src/cli/index.js -b "invoices/invoice-*.pdf" -l medium -d processed/

# Recursively compress all PDFs in project
node src/cli/index.js -b "**/*.pdf" -l medium -d compressed/ -r

# Process PDFs from specific year
node src/cli/index.js -b "reports/2024-*.pdf" -l less -d archive/
```

### Overwriting Existing Files

```bash
# Replace original files with compressed versions
node src/cli/index.js -b documents/ -l medium --overwrite

# Use with caution! Always backup first
```

---

## Advanced Features

### Quality Metrics Validation

To validate compression quality with PSNR/SSIM metrics, enable quality calculation in code:

```javascript
const { calculateQualityMetrics } = require('./src/utils/qualityMetrics');

// After compressing an image
const metrics = await calculateQualityMetrics(originalImageBuffer, compressedImageBuffer);

console.log(`PSNR: ${metrics.psnr} dB`);
console.log(`SSIM: ${metrics.ssim}`);
console.log(`Quality: ${metrics.quality}`);
console.log(metrics.interpretation);
```

**Quality Interpretation:**
- **PSNR > 40 dB:** Excellent (imperceptible differences)
- **PSNR 35-40 dB:** Very good (minor differences)
- **PSNR 30-35 dB:** Good (acceptable quality)
- **PSNR 25-30 dB:** Acceptable (visible artifacts)
- **PSNR < 25 dB:** Poor (significant degradation)

**SSIM Values:**
- **SSIM ≥ 0.98:** Excellent
- **SSIM ≥ 0.95:** Very good
- **SSIM ≥ 0.90:** Good
- **SSIM ≥ 0.80:** Acceptable
- **SSIM < 0.80:** Poor

### PDF Validation

Validate PDF integrity before and after compression:

```javascript
const { validatePDF, comparePDFs } = require('./src/validators/pdfValidator');

// Validate a PDF file
const results = await validatePDF('document.pdf');

if (results.isValid) {
  console.log('✓ PDF is valid');
  console.log(`Pages: ${results.details.pageCount}`);
} else {
  console.log('✗ PDF has issues:');
  results.errors.forEach(err => console.log(`  - ${err}`));
}

// Compare original and compressed
const comparison = await comparePDFs('original.pdf', 'compressed.pdf');

console.log(`Compression: ${comparison.stats.savingsPercent}%`);
console.log(`Pages: ${comparison.stats.originalPages} → ${comparison.stats.compressedPages}`);
```

---

## Programmatic Usage

Use the compression tool in your own Node.js applications:

### Basic Example

```javascript
const { compressPDF } = require('./src/controllers/compressionController');

async function compressDocument() {
  try {
    const result = await compressPDF({
      inputFile: 'input.pdf',
      compressionLevel: 'medium',
      outputFile: 'output.pdf'
    });

    console.log(`✓ Compression complete`);
    console.log(`  Original: ${(result.originalSize / 1024).toFixed(2)} KB`);
    console.log(`  Compressed: ${(result.compressedSize / 1024).toFixed(2)} KB`);
    console.log(`  Saved: ${((1 - result.compressionRatio) * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('Compression failed:', error.message);
  }
}

compressDocument();
```

### Batch Processing Example

```javascript
const { processBatch } = require('./src/controllers/batchProcessor');
const fs = require('fs');

async function compressAllDocuments() {
  const files = fs.readdirSync('documents')
    .filter(f => f.endsWith('.pdf'))
    .map(f => `documents/${f}`);

  for (const file of files) {
    try {
      const outputFile = file.replace('documents/', 'compressed/');

      await compressPDF({
        inputFile: file,
        compressionLevel: 'medium',
        outputFile: outputFile
      });

      console.log(`✓ Compressed: ${file}`);
    } catch (error) {
      console.error(`✗ Failed: ${file}`, error.message);
    }
  }
}

compressAllDocuments();
```

### Custom Configuration

```javascript
const { processPDF } = require('./src/processors/pdfProcessor');

// Define custom compression settings
const customSettings = {
  name: 'Custom',
  imageQuality: 60,
  imageDPI: 120,
  imageFormat: 'jpeg',
  removeMetadata: 'partial',
  fontSubsetting: true,
  objectCompression: 'moderate',
  calculateQualityMetrics: true // Enable quality metrics
};

async function compressWithCustomSettings() {
  const result = await processPDF(
    'input.pdf',
    'output.pdf',
    customSettings
  );

  console.log('Compression complete:', result);
}
```

---

## Real-World Scenarios

### Scenario 1: Email Attachment Optimization

You need to send a 10MB scanned document via email (5MB limit):

```bash
node src/cli/index.js -f scan.pdf -l extreme -o email-ready.pdf
```

**Result:** 10MB → 1.5MB (85% reduction)

### Scenario 2: Web Publishing

Optimizing product brochures for website download:

```bash
node src/cli/index.js -b brochures/ -l medium -d website/ -r
```

**Result:** Fast loading, good quality, balanced file sizes

### Scenario 3: Archive Storage

Compressing historical documents for long-term storage:

```bash
node src/cli/index.js -b archive/ -l extreme -d compressed-archive/ -r
```

**Result:** Massive storage savings while preserving readability

### Scenario 4: Print Production

Preparing final documents for professional printing:

```bash
node src/cli/index.js -f final-design.pdf -l less -o print.pdf
```

**Result:** Minimal compression, high DPI maintained, print-ready quality

---

## Troubleshooting

### PDF Fails to Compress

```bash
# Enable debug mode
DEBUG=1 node src/cli/index.js -f problematic.pdf -l medium
```

### Output File is Larger

Some PDFs are already optimized. Try different compression level:

```bash
# Try less aggressive compression
node src/cli/index.js -f already-small.pdf -l less
```

### Permission Denied

Ensure you have write permissions for output directory:

```bash
# Check permissions
ls -la output/

# Create directory if needed
mkdir -p output/
```

---

## Best Practices

1. **Always backup originals** before overwriting
2. **Test compression levels** on sample files first
3. **Use medium level** for most general purposes
4. **Enable quality metrics** for critical documents
5. **Batch process overnight** for large collections
6. **Validate output** before deleting originals

---

## Performance Tips

### Speed Up Batch Processing

```javascript
// Process files in parallel (custom script)
const files = [...]; // Your file list

const concurrencyLimit = 4; // Process 4 at a time
const chunks = chunkArray(files, concurrencyLimit);

for (const chunk of chunks) {
  await Promise.all(chunk.map(file => compressPDF({...})));
}
```

### Optimize for Large Files

For PDFs > 100MB:
- Use 'extreme' level for maximum compression
- Process during off-hours
- Consider splitting into chapters first

---

## Integration Examples

### Express.js API Endpoint

```javascript
const express = require('express');
const multer = require('multer');
const { compressPDF } = require('./pdf-compression-tool');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/compress', upload.single('pdf'), async (req, res) => {
  try {
    const result = await compressPDF({
      inputFile: req.file.path,
      compressionLevel: req.body.level || 'medium',
      outputFile: `compressed/${req.file.filename}`
    });

    res.download(`compressed/${req.file.filename}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### AWS Lambda Function

```javascript
exports.handler = async (event) => {
  const { s3Bucket, s3Key, compressionLevel } = event;

  // Download from S3
  // Compress
  // Upload compressed version
  // Return result
};
```

---

## Additional Resources

- [Architecture Documentation](docs/architecture.md)
- [Design Principles](docs/designPrinciple.md)
- [Compression Techniques](docs/techniques.md)
- [Success Metrics](docs/successMetric.md)
- [Detailed Implementation Guide](docs/detailedguide.md)

---

## Getting Help

- Check `--help` for command-line options
- Review [troubleshooting section](#troubleshooting)
- Report issues on GitHub: https://github.com/yourusername/pdf-compression-tool/issues

---

**Happy Compressing! 📄🗜️**
