#!/usr/bin/env node

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createLargeUncompressedPDF() {
  const pdfDoc = await PDFDocument.create();

  // Add multiple pages with large uncompressed images
  for (let i = 0; i < 5; i++) {
    const page = pdfDoc.addPage([800, 1000]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add title
    page.drawText(`Page ${i + 1} - Large Uncompressed Test`, {
      x: 50,
      y: 950,
      size: 24,
      font: font,
      color: rgb(0, 0, 0.5),
    });

    // Create a large PNG image (uncompressed)
    const largeImage = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 4,
        background: { r: 255 - i * 40, g: 100 + i * 30, b: 150 - i * 20, alpha: 1 }
      }
    })
    .png({ compressionLevel: 0 }) // No compression
    .toBuffer();

    // Embed the large image
    const pngImage = await pdfDoc.embedPng(largeImage);
    page.drawImage(pngImage, {
      x: 100,
      y: 200,
      width: 600,
      height: 600,
    });

    // Add lots of text
    let y = 150;
    for (let j = 0; j < 10; j++) {
      const text = `Line ${j}: This is a test line with repeated content to test compression. ` +
                   `The quick brown fox jumps over the lazy dog. 0123456789. ` +
                   `This content should compress well with Flate compression.`;
      page.drawText(text, {
        x: 50,
        y: y,
        size: 9,
        font: font,
      });
      y -= 12;
    }
  }

  pdfDoc.setTitle('Large Uncompressed Test PDF');
  pdfDoc.setAuthor('PDF Compression Tool Test Suite');
  pdfDoc.setSubject('Testing compression on unoptimized PDF');
  pdfDoc.setKeywords(['test', 'large', 'uncompressed', 'compression-test']);
  pdfDoc.setCreator('create-large-test-pdf.js');
  pdfDoc.setCreationDate(new Date());

  // Save without compression
  const pdfBytes = await pdfDoc.save({
    useObjectStreams: false, // Disable object streams
    addDefaultPage: false
  });

  const outputPath = path.join(__dirname, '..', 'test-large-uncompressed.pdf');
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`✓ Large uncompressed test PDF created: ${outputPath}`);
  console.log(`  Size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Pages: ${pdfDoc.getPageCount()}`);
  console.log('\nThis PDF should compress significantly better than already-optimized PDFs.');

  return outputPath;
}

createLargeUncompressedPDF().catch(console.error);
