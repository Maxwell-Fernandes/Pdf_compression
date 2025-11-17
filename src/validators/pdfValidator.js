const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

/**
 * Validate PDF file for correctness and compliance
 * Ensures compressed PDFs meet quality standards
 */

/**
 * Validate PDF file structure and integrity
 *
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} Validation results
 */
async function validatePDF(filePath) {
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    checks: {
      fileExists: false,
      isReadable: false,
      isPDF: false,
      hasPages: false,
      pagesAccessible: false,
      metadataAccessible: false,
      hasValidStructure: false
    },
    details: null
  };

  try {
    // Check 1: File exists
    if (!fs.existsSync(filePath)) {
      results.isValid = false;
      results.errors.push('File does not exist');
      return results;
    }
    results.checks.fileExists = true;

    // Check 2: File is readable
    let pdfBytes;
    try {
      pdfBytes = fs.readFileSync(filePath);
      results.checks.isReadable = true;
    } catch (error) {
      results.isValid = false;
      results.errors.push(`File is not readable: ${error.message}`);
      return results;
    }

    // Check 3: Is valid PDF
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
        updateMetadata: false
      });
      results.checks.isPDF = true;
    } catch (error) {
      results.isValid = false;
      results.errors.push(`Invalid PDF structure: ${error.message}`);
      return results;
    }

    // Check 4: Has pages
    try {
      const pageCount = pdfDoc.getPageCount();
      if (pageCount > 0) {
        results.checks.hasPages = true;
        results.details = { pageCount };
      } else {
        results.isValid = false;
        results.errors.push('PDF has no pages');
      }
    } catch (error) {
      results.isValid = false;
      results.errors.push(`Cannot determine page count: ${error.message}`);
    }

    // Check 5: Pages are accessible
    try {
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      if (firstPage) {
        const { width, height } = firstPage.getSize();
        results.checks.pagesAccessible = true;
        results.details.firstPageSize = { width, height };
      }
    } catch (error) {
      results.warnings.push(`Pages may not be fully accessible: ${error.message}`);
    }

    // Check 6: Metadata is accessible
    try {
      const title = pdfDoc.getTitle();
      const author = pdfDoc.getAuthor();
      results.checks.metadataAccessible = true;
      results.details.hasMetadata = !!(title || author);
    } catch (error) {
      results.warnings.push(`Metadata may not be accessible: ${error.message}`);
    }

    // Check 7: Valid structure
    try {
      // Try to save the PDF to verify it's well-formed
      await pdfDoc.save();
      results.checks.hasValidStructure = true;
    } catch (error) {
      results.isValid = false;
      results.errors.push(`PDF structure is invalid: ${error.message}`);
    }

    // Additional validation checks
    await performAdditionalChecks(pdfDoc, results);

    return results;
  } catch (error) {
    results.isValid = false;
    results.errors.push(`Validation failed: ${error.message}`);
    return results;
  }
}

/**
 * Perform additional validation checks
 */
async function performAdditionalChecks(pdfDoc, results) {
  try {
    // Check for encrypted/password-protected PDFs
    try {
      const isEncrypted = pdfDoc.isEncrypted;
      if (isEncrypted) {
        results.warnings.push('PDF appears to be encrypted');
      }
    } catch (error) {
      // Encryption check not supported, skip
    }

    // Check file size sanity
    if (results.details) {
      const context = pdfDoc.context;
      const objectCount = context.indirectObjects.size;
      results.details.objectCount = objectCount;

      // Warn if unusually high object count
      if (objectCount > 50000) {
        results.warnings.push(`High object count (${objectCount}) - PDF may be inefficient`);
      }
    }
  } catch (error) {
    results.warnings.push(`Additional checks incomplete: ${error.message}`);
  }
}

/**
 * Compare two PDFs to ensure compression didn't corrupt the document
 *
 * @param {string} originalPath - Path to original PDF
 * @param {string} compressedPath - Path to compressed PDF
 * @returns {Promise<Object>} Comparison results
 */
async function comparePDFs(originalPath, compressedPath) {
  const comparison = {
    isValid: true,
    issues: [],
    warnings: [],
    stats: {}
  };

  try {
    // Load both PDFs
    const originalBytes = fs.readFileSync(originalPath);
    const compressedBytes = fs.readFileSync(compressedPath);

    const originalDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const compressedDoc = await PDFDocument.load(compressedBytes, { ignoreEncryption: true });

    // Compare page counts
    const originalPages = originalDoc.getPageCount();
    const compressedPages = compressedDoc.getPageCount();

    comparison.stats.originalPages = originalPages;
    comparison.stats.compressedPages = compressedPages;

    if (originalPages !== compressedPages) {
      comparison.isValid = false;
      comparison.issues.push(`Page count mismatch: ${originalPages} → ${compressedPages}`);
    }

    // Compare page sizes
    const originalPageSizes = originalDoc.getPages().map(p => p.getSize());
    const compressedPageSizes = compressedDoc.getPages().map(p => p.getSize());

    for (let i = 0; i < Math.min(originalPages, compressedPages); i++) {
      const origSize = originalPageSizes[i];
      const compSize = compressedPageSizes[i];

      if (Math.abs(origSize.width - compSize.width) > 1 ||
          Math.abs(origSize.height - compSize.height) > 1) {
        comparison.warnings.push(
          `Page ${i + 1} size changed: ${origSize.width}x${origSize.height} → ${compSize.width}x${compSize.height}`
        );
      }
    }

    // Compare file sizes
    comparison.stats.originalSize = originalBytes.length;
    comparison.stats.compressedSize = compressedBytes.length;
    comparison.stats.compressionRatio = (compressedBytes.length / originalBytes.length);
    comparison.stats.savingsPercent = ((1 - comparison.stats.compressionRatio) * 100).toFixed(2);

    return comparison;
  } catch (error) {
    comparison.isValid = false;
    comparison.issues.push(`Comparison failed: ${error.message}`);
    return comparison;
  }
}

/**
 * Validate PDF against ISO 32000 standards (basic checks)
 */
async function validatePDFStandards(filePath) {
  const results = {
    compliant: true,
    version: null,
    issues: [],
    warnings: []
  };

  try {
    const pdfBytes = fs.readFileSync(filePath);

    // Check PDF header
    const header = pdfBytes.slice(0, 8).toString('ascii');
    const pdfVersionMatch = header.match(/%PDF-(\d\.\d)/);

    if (!pdfVersionMatch) {
      results.compliant = false;
      results.issues.push('Invalid or missing PDF header');
      return results;
    }

    results.version = pdfVersionMatch[1];

    // Check for EOF marker
    const trailer = pdfBytes.slice(-1024).toString('ascii');
    if (!trailer.includes('%%EOF')) {
      results.warnings.push('EOF marker not found in expected location');
    }

    // Check for xref table or xref stream
    if (!trailer.includes('xref') && !trailer.includes('/XRef')) {
      results.warnings.push('Cross-reference table may be malformed');
    }

    // Load and check structure
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Check catalog
    try {
      const context = pdfDoc.context;
      const catalog = context.lookup(context.trailerInfo.Root);

      if (!catalog) {
        results.compliant = false;
        results.issues.push('Document catalog is missing');
      }
    } catch (error) {
      results.warnings.push(`Catalog validation incomplete: ${error.message}`);
    }

    return results;
  } catch (error) {
    results.compliant = false;
    results.issues.push(`Standards validation failed: ${error.message}`);
    return results;
  }
}

/**
 * Get detailed PDF information for debugging
 */
async function getPDFInfo(filePath) {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const info = {
      pageCount: pdfDoc.getPageCount(),
      fileSize: pdfBytes.length,
      fileSizeKB: (pdfBytes.length / 1024).toFixed(2),
      title: pdfDoc.getTitle() || 'Untitled',
      author: pdfDoc.getAuthor() || 'Unknown',
      subject: pdfDoc.getSubject() || '',
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      creationDate: pdfDoc.getCreationDate() || null,
      modificationDate: pdfDoc.getModificationDate() || null,
      keywords: pdfDoc.getKeywords() || [],
      objectCount: pdfDoc.context.indirectObjects.size,
      pages: []
    };

    // Get page information
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const size = page.getSize();
      info.pages.push({
        number: i + 1,
        width: size.width,
        height: size.height,
        rotation: page.getRotation().angle
      });
    }

    return info;
  } catch (error) {
    throw new Error(`Failed to get PDF info: ${error.message}`);
  }
}

module.exports = {
  validatePDF,
  comparePDFs,
  validatePDFStandards,
  getPDFInfo
};
