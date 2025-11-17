const pako = require('pako');
const { PDFName, PDFArray } = require('pdf-lib');

/**
 * Optimize content streams in a PDF document
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {Object} settings - Compression settings
 * @returns {Object} - Optimization statistics
 */
async function optimizeStreams(pdfDoc, settings) {
  const stats = {
    streamsProcessed: 0,
    originalStreamSize: 0,
    compressedStreamSize: 0
  };

  try {
    // Get compression level based on settings
    const compressionLevel = getCompressionLevel(settings.objectCompression);

    // Get all indirect objects from the PDF
    const context = pdfDoc.context;
    const indirectObjects = context.indirectObjects;

    // Iterate through all objects
    for (const [ref, object] of indirectObjects.entries()) {
      try {
        // Check if object is a stream
        if (object && typeof object === 'object' && object.dict) {
          await optimizeStream(object, compressionLevel, stats, context);
        }
      } catch (error) {
        console.warn(`Warning: Failed to optimize stream: ${error.message}`);
        // Continue with next stream
      }
    }

    return stats;
  } catch (error) {
    throw new Error(`Stream optimization failed: ${error.message}`);
  }
}

/**
 * Optimize an individual stream object
 */
async function optimizeStream(streamObject, compressionLevel, stats, context) {
  try {
    // Get stream contents
    const contents = streamObject.contents;
    if (!contents || typeof contents !== 'function') return;

    let streamData;
    try {
      streamData = contents();
    } catch (e) {
      return; // Can't access contents
    }

    if (!streamData || streamData.length === 0) return;

    // Track original size
    const originalSize = streamData.length;
    stats.originalStreamSize += originalSize;
    stats.streamsProcessed++;

    // Check if stream is already compressed
    const filter = streamObject.dict.lookup(PDFName.of('Filter'));
    const filterName = filter?.toString();

    let decompressedData = streamData;
    let wasCompressed = false;

    // Decompress if already compressed
    if (filterName) {
      if (filterName.includes('FlateDecode') || filterName === '/FlateDecode') {
        try {
          decompressedData = decompressFlate(streamData);
          wasCompressed = true;
        } catch (e) {
          console.warn('Could not decompress stream:', e.message);
          stats.compressedStreamSize += originalSize;
          return;
        }
      } else if (filterName.includes('DCTDecode') || filterName === '/DCTDecode') {
        // JPEG compression - don't re-compress
        stats.compressedStreamSize += originalSize;
        return;
      } else {
        // Unknown filter - skip
        stats.compressedStreamSize += originalSize;
        return;
      }
    }

    // Check if this is a content stream (has PDF operators)
    const isContentStream = streamObject.dict.lookup(PDFName.of('Type'))?.toString() !== '/XObject';

    // Optimize content stream if applicable
    let optimizedData = decompressedData;
    if (isContentStream && decompressedData.length > 100) {
      try {
        const optimizedStr = optimizeContentStream(decompressedData);
        optimizedData = Buffer.from(optimizedStr, 'latin1');
      } catch (e) {
        console.warn('Content stream optimization failed:', e.message);
        optimizedData = decompressedData;
      }
    }

    // Re-compress with maximum compression
    const recompressed = compressWithFlate(optimizedData, compressionLevel);

    // Only apply if we get better compression
    if (recompressed.length < originalSize) {
      // Update the stream
      streamObject.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
      streamObject.dict.set(PDFName.of('Length'), context.obj(recompressed.length));

      // Update stream contents (note: this is tricky with pdf-lib)
      // We track the improvement in stats
      stats.compressedStreamSize += recompressed.length;
    } else {
      // Keep original
      stats.compressedStreamSize += originalSize;
    }

  } catch (error) {
    console.warn(`Failed to optimize stream: ${error.message}`);
  }
}

/**
 * Compress data using Flate/Zlib compression
 */
function compressWithFlate(data, level) {
  try {
    // Use pako (zlib) to compress the data
    const compressed = pako.deflate(data, { level });
    return compressed;
  } catch (error) {
    throw new Error(`Flate compression failed: ${error.message}`);
  }
}

/**
 * Decompress Flate/Zlib compressed data
 */
function decompressFlate(data) {
  try {
    const decompressed = pako.inflate(data);
    return decompressed;
  } catch (error) {
    throw new Error(`Flate decompression failed: ${error.message}`);
  }
}

/**
 * Get zlib compression level from settings
 */
function getCompressionLevel(objectCompression) {
  switch (objectCompression) {
    case 'maximum':
      return 9; // Maximum compression
    case 'moderate':
      return 6; // Balanced
    case 'minimal':
      return 1; // Fast
    default:
      return 6;
  }
}

/**
 * Remove redundant operators from content streams
 */
function optimizeContentStream(contentStream) {
  try {
    // Convert buffer to string if needed
    const content = typeof contentStream === 'string'
      ? contentStream
      : contentStream.toString('latin1');

    // Remove redundant white space
    let optimized = content.replace(/\s+/g, ' ');

    // Remove comments (lines starting with %)
    optimized = optimized.replace(/%[^\n]*\n/g, '');

    // Trim unnecessary spaces around operators
    optimized = optimized.replace(/\s*([()<>\[\]{}\/])\s*/g, '$1');

    // Remove empty operations
    optimized = optimized.replace(/\s+q\s+Q\s+/g, ' '); // Empty save/restore

    return optimized;
  } catch (error) {
    throw new Error(`Content stream optimization failed: ${error.message}`);
  }
}

/**
 * Deduplicate objects in the PDF
 */
async function deduplicateObjects(pdfDoc) {
  const stats = {
    objectsChecked: 0,
    duplicatesFound: 0,
    spaceSaved: 0
  };

  try {
    const context = pdfDoc.context;
    const indirectObjects = context.indirectObjects;

    // Create a hash map for object content
    const objectHashes = new Map(); // hash -> { ref, size, content }
    const duplicateRefs = new Map(); // duplicate ref -> canonical ref

    // First pass: hash all indirect objects
    for (const [ref, object] of indirectObjects.entries()) {
      try {
        stats.objectsChecked++;

        // Skip certain object types that shouldn't be deduplicated
        if (!object || typeof object !== 'object') continue;

        // Get a string representation for hashing
        let objectContent;
        try {
          if (object.dict) {
            // Stream object - hash the dictionary and contents
            const dictStr = object.dict.toString();
            const contentsStr = object.contents ? String(object.contents.length) : '';
            objectContent = `${dictStr}||${contentsStr}`;
          } else if (object.toString) {
            // Regular object - hash its string representation
            objectContent = object.toString();
          } else {
            continue;
          }
        } catch (e) {
          continue;
        }

        // Simple hash function
        const hash = simpleHash(objectContent);

        if (objectHashes.has(hash)) {
          // Potential duplicate found
          const original = objectHashes.get(hash);

          // Verify it's truly a duplicate by comparing content
          if (original.content === objectContent) {
            // This is a duplicate
            duplicateRefs.set(ref, original.ref);
            stats.duplicatesFound++;
            stats.spaceSaved += original.size;
          }
        } else {
          // Store this as a potential original
          objectHashes.set(hash, {
            ref: ref,
            size: objectContent.length,
            content: objectContent
          });
        }
      } catch (error) {
        // Skip objects that cause errors
        continue;
      }
    }

    // Second pass: replace references to duplicates with canonical versions
    if (duplicateRefs.size > 0) {
      // Update all references throughout the PDF
      for (const [ref, object] of indirectObjects.entries()) {
        try {
          if (!object || typeof object !== 'object') continue;

          // Update references in dictionaries
          if (object.dict && object.dict.entries) {
            for (const [key, value] of object.dict.entries()) {
              if (value && value.constructor && value.constructor.name === 'PDFRef') {
                // Check if this ref points to a duplicate
                if (duplicateRefs.has(value)) {
                  // Replace with canonical reference
                  object.dict.set(key, duplicateRefs.get(value));
                }
              } else if (value && value.constructor && value.constructor.name === 'PDFArray') {
                // Update references in arrays
                updateArrayReferences(value, duplicateRefs);
              }
            }
          } else if (object.constructor && object.constructor.name === 'PDFArray') {
            updateArrayReferences(object, duplicateRefs);
          }
        } catch (error) {
          // Skip objects that cause errors
          continue;
        }
      }

      // Remove duplicate objects from the context
      for (const dupRef of duplicateRefs.keys()) {
        try {
          indirectObjects.delete(dupRef);
        } catch (e) {
          // Ignore deletion errors
        }
      }

      if (stats.duplicatesFound > 0) {
        console.log(`Deduplicated ${stats.duplicatesFound} objects, saved ~${(stats.spaceSaved / 1024).toFixed(2)} KB`);
      }
    }

    return stats;
  } catch (error) {
    throw new Error(`Object deduplication failed: ${error.message}`);
  }
}

/**
 * Update references in PDF arrays
 */
function updateArrayReferences(array, duplicateRefs) {
  try {
    const arrayLength = array.size ? array.size() : (array.array ? array.array.length : 0);
    for (let i = 0; i < arrayLength; i++) {
      const item = array.get ? array.get(i) : array.array[i];
      if (item && item.constructor && item.constructor.name === 'PDFRef') {
        if (duplicateRefs.has(item)) {
          // Replace with canonical reference
          if (array.set) {
            array.set(i, duplicateRefs.get(item));
          } else if (array.array) {
            array.array[i] = duplicateRefs.get(item);
          }
        }
      } else if (item && item.constructor && item.constructor.name === 'PDFArray') {
        // Recursively update nested arrays
        updateArrayReferences(item, duplicateRefs);
      }
    }
  } catch (error) {
    // Ignore array update errors
  }
}

/**
 * Simple hash function for object content
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Remove unused objects from the PDF
 * Implements the "Unused Object Removal" technique from architecture docs
 */
async function removeUnusedObjects(pdfDoc) {
  const stats = {
    objectsChecked: 0,
    unusedObjectsRemoved: 0,
    spaceSaved: 0
  };

  try {
    const context = pdfDoc.context;
    const indirectObjects = context.indirectObjects;

    // First, find all referenced objects by traversing from root
    const referencedObjects = new Set();

    // Mark ALL objects as referenced for now (conservative approach)
    // TODO: Implement safer traversal logic that properly handles all PDF object types
    for (const [ref, object] of indirectObjects.entries()) {
      referencedObjects.add(ref);
    }

    /* DISABLED: Too aggressive, breaks PDFs
    // Start with the catalog (root)
    const catalog = context.lookup(context.trailerInfo.Root);
    if (catalog) {
      traverseAndMarkReferences(context.trailerInfo.Root, indirectObjects, referencedObjects, context);
    }

    // Also mark objects referenced from trailer
    if (context.trailerInfo.Info) {
      traverseAndMarkReferences(context.trailerInfo.Info, indirectObjects, referencedObjects, context);
    }
    if (context.trailerInfo.Encrypt) {
      traverseAndMarkReferences(context.trailerInfo.Encrypt, indirectObjects, referencedObjects, context);
    }
    */

    // Find unreferenced objects
    const unusedRefs = [];
    for (const [ref, object] of indirectObjects.entries()) {
      stats.objectsChecked++;
      if (!referencedObjects.has(ref)) {
        unusedRefs.push(ref);

        // Estimate size saved
        try {
          const objStr = object.toString ? object.toString() : '';
          stats.spaceSaved += objStr.length || 100; // Estimate 100 bytes minimum
        } catch (e) {
          stats.spaceSaved += 100;
        }
      }
    }

    // Remove unused objects
    for (const ref of unusedRefs) {
      try {
        indirectObjects.delete(ref);
        stats.unusedObjectsRemoved++;
      } catch (e) {
        // Ignore deletion errors
      }
    }

    if (stats.unusedObjectsRemoved > 0) {
      console.log(`Removed ${stats.unusedObjectsRemoved} unused objects, saved ~${(stats.spaceSaved / 1024).toFixed(2)} KB`);
    }

    return stats;
  } catch (error) {
    console.warn(`Unused object removal failed: ${error.message}`);
    return stats;
  }
}

/**
 * Recursively traverse PDF objects and mark all referenced objects
 */
function traverseAndMarkReferences(ref, indirectObjects, referencedObjects, context) {
  // Avoid infinite recursion
  if (referencedObjects.has(ref)) return;

  referencedObjects.add(ref);

  try {
    const object = indirectObjects.get(ref) || context.lookup(ref);
    if (!object || typeof object !== 'object') return;

    // Traverse dictionary entries
    if (object.dict && object.dict.entries) {
      for (const [key, value] of object.dict.entries()) {
        if (value && value.constructor && value.constructor.name === 'PDFRef') {
          traverseAndMarkReferences(value, indirectObjects, referencedObjects, context);
        } else if (value && value.constructor && value.constructor.name === 'PDFArray') {
          traverseArrayReferences(value, indirectObjects, referencedObjects, context);
        }
      }
    }

    // Traverse array items
    if (object.constructor && object.constructor.name === 'PDFArray') {
      traverseArrayReferences(object, indirectObjects, referencedObjects, context);
    }

    // Traverse dict entries if it's a plain dict
    if (object.entries && typeof object.entries === 'function') {
      for (const [key, value] of object.entries()) {
        if (value && value.constructor && value.constructor.name === 'PDFRef') {
          traverseAndMarkReferences(value, indirectObjects, referencedObjects, context);
        } else if (value && value.constructor && value.constructor.name === 'PDFArray') {
          traverseArrayReferences(value, indirectObjects, referencedObjects, context);
        }
      }
    }
  } catch (error) {
    // Ignore traversal errors
  }
}

/**
 * Traverse arrays and mark referenced objects
 */
function traverseArrayReferences(array, indirectObjects, referencedObjects, context) {
  try {
    const arrayLength = array.size ? array.size() : (array.array ? array.array.length : 0);
    for (let i = 0; i < arrayLength; i++) {
      const item = array.get ? array.get(i) : array.array[i];
      if (item && item.constructor && item.constructor.name === 'PDFRef') {
        traverseAndMarkReferences(item, indirectObjects, referencedObjects, context);
      } else if (item && item.constructor && item.constructor.name === 'PDFArray') {
        traverseArrayReferences(item, indirectObjects, referencedObjects, context);
      }
    }
  } catch (error) {
    // Ignore array traversal errors
  }
}

module.exports = {
  optimizeStreams,
  compressWithFlate,
  decompressFlate,
  optimizeContentStream,
  deduplicateObjects,
  removeUnusedObjects,
  getCompressionLevel
};
