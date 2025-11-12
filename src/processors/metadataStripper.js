const { PDFName } = require('pdf-lib');

/**
 * Remove or strip metadata from PDF document
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {Object} settings - Compression settings
 * @returns {Object} - Metadata stripping statistics
 */
async function stripMetadata(pdfDoc, settings) {
  const stats = {
    metadataRemoved: 0,
    fieldsCleared: 0
  };

  try {
    const removeLevel = settings.removeMetadata;

    if (removeLevel === false) {
      // Don't remove metadata
      return stats;
    }

    // Remove standard metadata fields
    if (removeLevel === true || removeLevel === 'partial') {
      await removeStandardMetadata(pdfDoc, removeLevel, stats);
    }

    // Remove XMP metadata
    if (removeLevel === true) {
      await removeXMPMetadata(pdfDoc, stats);
    }

    // Remove embedded thumbnails
    if (removeLevel === true) {
      await removeThumbnails(pdfDoc, stats);
    }

    return stats;
  } catch (error) {
    throw new Error(`Metadata stripping failed: ${error.message}`);
  }
}

/**
 * Remove standard PDF metadata fields
 */
async function removeStandardMetadata(pdfDoc, level, stats) {
  try {
    if (level === true) {
      // Remove all metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      stats.fieldsCleared += 6;
    } else if (level === 'partial') {
      // Keep title and author, remove others
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      stats.fieldsCleared += 4;
    }

    // Remove creation and modification dates for extreme compression
    if (level === true) {
      try {
        pdfDoc.setCreationDate(new Date(0));
        pdfDoc.setModificationDate(new Date(0));
        stats.fieldsCleared += 2;
      } catch (error) {
        // Dates might not be settable in all cases
      }
    }

    stats.metadataRemoved++;
  } catch (error) {
    throw new Error(`Failed to remove standard metadata: ${error.message}`);
  }
}

/**
 * Remove XMP metadata
 */
async function removeXMPMetadata(pdfDoc, stats) {
  try {
    const context = pdfDoc.context;
    const catalog = context.lookup(context.trailerInfo.Root);

    if (!catalog) return;

    // Look for Metadata entry in catalog
    const metadata = catalog.lookup(PDFName.of('Metadata'));

    if (metadata) {
      // Remove the metadata entry
      catalog.delete(PDFName.of('Metadata'));
      stats.metadataRemoved++;
    }

    // Also check for XMP metadata in pages
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const pageDict = page.node;
      const pageMetadata = pageDict.lookup(PDFName.of('Metadata'));

      if (pageMetadata) {
        pageDict.delete(PDFName.of('Metadata'));
        stats.metadataRemoved++;
      }
    }

  } catch (error) {
    console.warn(`Warning: Failed to remove XMP metadata: ${error.message}`);
  }
}

/**
 * Remove embedded thumbnails
 */
async function removeThumbnails(pdfDoc, stats) {
  try {
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const pageDict = page.node;

      // Check for Thumb entry (page thumbnail)
      const thumb = pageDict.lookup(PDFName.of('Thumb'));

      if (thumb) {
        pageDict.delete(PDFName.of('Thumb'));
        stats.metadataRemoved++;
      }
    }

  } catch (error) {
    console.warn(`Warning: Failed to remove thumbnails: ${error.message}`);
  }
}

/**
 * Get metadata information for display
 */
function getMetadataInfo(pdfDoc) {
  try {
    const info = {
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      keywords: pdfDoc.getKeywords() || [],
      producer: pdfDoc.getProducer() || '',
      creator: pdfDoc.getCreator() || '',
      creationDate: pdfDoc.getCreationDate() || null,
      modificationDate: pdfDoc.getModificationDate() || null
    };

    return info;
  } catch (error) {
    return {};
  }
}

/**
 * Remove custom metadata entries
 */
async function removeCustomMetadata(pdfDoc, stats) {
  try {
    const context = pdfDoc.context;
    const info = context.lookup(context.trailerInfo.Info);

    if (!info || !info.dict) return;

    // Standard metadata keys to preserve (if partial removal)
    const standardKeys = [
      'Title', 'Author', 'Subject', 'Keywords',
      'Creator', 'Producer', 'CreationDate', 'ModDate'
    ];

    // Get all entries
    const entries = info.dict.entries();

    for (const [key] of entries) {
      const keyName = key.toString().replace('/', '');

      // Remove non-standard metadata
      if (!standardKeys.includes(keyName)) {
        info.dict.delete(key);
        stats.fieldsCleared++;
      }
    }

  } catch (error) {
    console.warn(`Warning: Failed to remove custom metadata: ${error.message}`);
  }
}

module.exports = {
  stripMetadata,
  removeStandardMetadata,
  removeXMPMetadata,
  removeThumbnails,
  removeCustomMetadata,
  getMetadataInfo
};
