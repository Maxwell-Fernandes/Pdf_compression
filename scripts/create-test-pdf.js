#!/usr/bin/env node

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestPDF() {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  // Page 1: Text-heavy page
  const page1 = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page1.getSize();

  page1.drawText('PDF Compression Tool - Test Document', {
    x: 50,
    y: height - 50,
    size: 24,
    font: helveticaFont,
    color: rgb(0, 0, 0.5),
  });

  // Add some text content
  const textContent = `
This is a test PDF document created to validate the PDF compression tool.
It contains multiple pages with different types of content:

1. Text in multiple fonts (Times Roman, Helvetica, Courier)
2. Repeated content to test stream compression
3. Metadata that can be stripped
4. Multiple font types for subsetting tests

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
cillum dolore eu fugiat nulla pariatur.

The quick brown fox jumps over the lazy dog.
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789

This content is repeated to increase file size and test compression efficiency.
This content is repeated to increase file size and test compression efficiency.
This content is repeated to increase file size and test compression efficiency.
This content is repeated to increase file size and test compression efficiency.
`.trim();

  let yPosition = height - 100;
  const lines = textContent.split('\n');

  for (const line of lines) {
    if (yPosition < 50) break;
    page1.drawText(line, {
      x: 50,
      y: yPosition,
      size: 11,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }

  // Page 2: Different font
  const page2 = pdfDoc.addPage([595, 842]);

  page2.drawText('Page 2 - Courier Font Test', {
    x: 50,
    y: page2.getHeight() - 50,
    size: 18,
    font: courierFont,
    color: rgb(0.5, 0, 0),
  });

  const codeContent = `
function compressPDF(input, output, level) {
  const settings = COMPRESSION_LEVELS[level];

  // Process PDF
  const result = processPDF(input, output, settings);

  return result;
}

// More code content
for (let i = 0; i < 100; i++) {
  console.log("Line " + i);
}
`.trim();

  yPosition = page2.getHeight() - 100;
  for (const line of codeContent.split('\n')) {
    if (yPosition < 50) break;
    page2.drawText(line, {
      x: 50,
      y: yPosition,
      size: 10,
      font: courierFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 14;
  }

  // Page 3: More repetitive content
  const page3 = pdfDoc.addPage([595, 842]);

  page3.drawText('Page 3 - Repetitive Content for Stream Testing', {
    x: 50,
    y: page3.getHeight() - 50,
    size: 16,
    font: helveticaFont,
    color: rgb(0, 0.5, 0),
  });

  yPosition = page3.getHeight() - 100;
  const repetitiveText = 'This line is repeated many times to test stream compression algorithms. ';

  for (let i = 0; i < 40; i++) {
    if (yPosition < 50) break;
    page3.drawText(`${i + 1}. ${repetitiveText}`, {
      x: 50,
      y: yPosition,
      size: 9,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 12;
  }

  // Set metadata
  pdfDoc.setTitle('PDF Compression Test Document');
  pdfDoc.setAuthor('PDF Compression Tool');
  pdfDoc.setSubject('Test document for compression validation');
  pdfDoc.setKeywords(['test', 'compression', 'pdf', 'validation']);
  pdfDoc.setProducer('pdf-lib');
  pdfDoc.setCreator('create-test-pdf.js');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  const outputPath = path.join(__dirname, '..', 'test-input.pdf');
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`✓ Test PDF created: ${outputPath}`);
  console.log(`  Size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
  console.log(`  Pages: ${pdfDoc.getPageCount()}`);

  return outputPath;
}

createTestPDF().catch(console.error);
