const { validatePDF, comparePDFs, validatePDFStandards, getPDFInfo } = require('../src/validators/pdfValidator');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

describe('PDF Validator', () => {
  let testPdfPath;

  beforeAll(async () => {
    // Create a test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Test PDF', {
      x: 50,
      y: 350,
      size: 30,
      font: font
    });

    pdfDoc.setTitle('Test Document');
    pdfDoc.setAuthor('Test Author');

    const pdfBytes = await pdfDoc.save();
    testPdfPath = path.join(__dirname, 'test-validation.pdf');
    fs.writeFileSync(testPdfPath, pdfBytes);
  });

  afterAll(() => {
    // Clean up test PDF
    if (fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
    }
  });

  describe('validatePDF', () => {
    test('should validate a correct PDF', async () => {
      const results = await validatePDF(testPdfPath);

      expect(results.isValid).toBe(true);
      expect(results.errors).toHaveLength(0);
      expect(results.checks.fileExists).toBe(true);
      expect(results.checks.isReadable).toBe(true);
      expect(results.checks.isPDF).toBe(true);
      expect(results.checks.hasPages).toBe(true);
    });

    test('should fail for non-existent file', async () => {
      const results = await validatePDF('/non/existent/file.pdf');

      expect(results.isValid).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.checks.fileExists).toBe(false);
    });

    test('should fail for non-PDF file', async () => {
      const textFilePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(textFilePath, 'This is not a PDF');

      const results = await validatePDF(textFilePath);

      expect(results.isValid).toBe(false);
      expect(results.errors.length).toBeGreaterThan(0);

      fs.unlinkSync(textFilePath);
    });
  });

  describe('validatePDFStandards', () => {
    test('should check PDF standards compliance', async () => {
      const results = await validatePDFStandards(testPdfPath);

      expect(results).toHaveProperty('compliant');
      expect(results).toHaveProperty('version');
      expect(results.version).toMatch(/\d\.\d/);
    });
  });

  describe('getPDFInfo', () => {
    test('should extract PDF information', async () => {
      const info = await getPDFInfo(testPdfPath);

      expect(info).toHaveProperty('pageCount');
      expect(info).toHaveProperty('fileSize');
      expect(info).toHaveProperty('title');
      expect(info).toHaveProperty('author');
      expect(info.pageCount).toBe(1);
      expect(info.title).toBe('Test Document');
      expect(info.author).toBe('Test Author');
    });
  });

  describe('comparePDFs', () => {
    test('should compare two PDF files', async () => {
      // Create a second PDF (slightly different)
      const pdfDoc2 = await PDFDocument.create();
      const page2 = pdfDoc2.addPage([600, 400]);
      const font2 = await pdfDoc2.embedFont(StandardFonts.Helvetica);

      page2.drawText('Test PDF Modified', {
        x: 50,
        y: 350,
        size: 30,
        font: font2
      });

      const pdfBytes2 = await pdfDoc2.save();
      const testPdfPath2 = path.join(__dirname, 'test-validation-2.pdf');
      fs.writeFileSync(testPdfPath2, pdfBytes2);

      const comparison = await comparePDFs(testPdfPath, testPdfPath2);

      expect(comparison).toHaveProperty('isValid');
      expect(comparison).toHaveProperty('stats');
      expect(comparison.stats.originalPages).toBe(1);
      expect(comparison.stats.compressedPages).toBe(1);

      fs.unlinkSync(testPdfPath2);
    });
  });
});
