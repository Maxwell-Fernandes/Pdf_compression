const sharp = require('sharp');
const { PDFDocument, PDFImage, PDFName, PDFRawStream } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pako = require('pako');
const { calculateQualityMetrics } = require('../utils/qualityMetrics');

/**
 * Extract and compress images from a PDF document
 * @param {PDFDocument} pdfDoc - The PDF document
 * @param {Object} settings - Compression settings
 * @returns {Object} - Compression statistics
 */
async function compressImages(pdfDoc, settings) {
  const stats = {
    imagesProcessed: 0,
    originalImagesSize: 0,
    compressedImagesSize: 0,
    qualityMetrics: []
  };

  try {
    // Get all pages
    const pages = pdfDoc.getPages();

    // Process each page
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];

      // Get page resources
      const pageDict = page.node;
      const resources = pageDict.lookup(PDFName.of('Resources'));

      if (!resources) continue;

      // Get XObject resources (which contain images)
      const xObjects = resources.lookup(PDFName.of('XObject'));

      if (!xObjects) continue;

      // Get all XObject entries
      const xObjectEntries = Array.from(xObjects.dict.entries());
      const imagesToReplace = [];

      // First pass: extract and compress all images
      for (const [name, ref] of xObjectEntries) {
        try {
          const xObject = xObjects.lookup(name);

          // xObject is already the looked-up object, check if it has a dict property (stream) or is a dict
          const objectDict = xObject?.dict || xObject;
          if (!objectDict) continue;

          // Check if it's an image
          const subtype = objectDict.get ? objectDict.get(PDFName.of('Subtype')) : objectDict.lookup(PDFName.of('Subtype'));
          if (subtype?.toString() !== '/Image') continue;

          stats.imagesProcessed++;

          // Extract and compress the image
          const result = await compressXObjectImage(pdfDoc, xObject, ref, page, name, settings, stats);

          if (result) {
            imagesToReplace.push(result);
          }
        } catch (error) {
          console.warn(`Warning: Failed to process image on page ${pageIndex + 1}: ${error.message}`);
          // Continue with next image
        }
      }

      // Second pass: replace images in the XObject dictionary
      // Note: pdf-lib makes direct replacement difficult, so we update the reference
      for (const replacement of imagesToReplace) {
        try {
          const { embeddedImage, xObjectName } = replacement;

          // Get the embedded image reference
          const imageRef = embeddedImage.ref;

          // Update the XObject dictionary to point to the new image
          xObjects.dict.set(xObjectName, imageRef);
        } catch (error) {
          console.warn(`Warning: Failed to replace image ${replacement.xObjectName}: ${error.message}`);
        }
      }
    }

    return stats;
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`);
  }
}

/**
 * Compress an individual XObject image
 */
async function compressXObjectImage(pdfDoc, xObject, xObjectRef, page, xObjectName, settings, stats) {
  try {
    // xObject is already looked up - access its dict or use it directly
    const objectDict = xObject?.dict || xObject;
    if (!objectDict) return null;

    // Get image properties - use get() for dict access
    const widthObj = objectDict.get ? objectDict.get(PDFName.of('Width')) : objectDict.lookup(PDFName.of('Width'));
    const heightObj = objectDict.get ? objectDict.get(PDFName.of('Height')) : objectDict.lookup(PDFName.of('Height'));

    const width = widthObj?.asNumber ? widthObj.asNumber() : (typeof widthObj === 'number' ? widthObj : null);
    const height = heightObj?.asNumber ? heightObj.asNumber() : (typeof heightObj === 'number' ? heightObj : null);

    if (!width || !height) return null;

    // Calculate target dimensions based on DPI setting
    const targetDPI = settings.imageDPI;
    const scaleFactor = Math.min(1, targetDPI / 300);
    const targetWidth = Math.round(width * scaleFactor);
    const targetHeight = Math.round(height * scaleFactor);

    // Get original size for statistics
    const lengthObj = objectDict.get ? objectDict.get(PDFName.of('Length')) : objectDict.lookup(PDFName.of('Length'));
    const originalSize = lengthObj?.asNumber ? lengthObj.asNumber() : 0;
    stats.originalImagesSize += originalSize;

    // Skip if image is already small or no compression needed
    if (width <= targetWidth && height <= targetHeight && originalSize < 10000) {
      stats.compressedImagesSize += originalSize;
      return null;
    }

    // Step 1: Extract image data
    const imageData = await extractImageData(xObject);

    if (!imageData) {
      console.warn(`Could not extract image data, skipping compression`);
      stats.compressedImagesSize += originalSize;
      return null;
    }

    // Step 2: Compress with Sharp
    const compressedData = await compressImageBuffer(imageData, settings);

    if (!compressedData || !compressedData.buffer) {
      console.warn(`Compression failed, skipping`);
      stats.compressedImagesSize += originalSize;
      return null;
    }

    // Step 2.5: Calculate quality metrics (if enabled)
    if (settings.calculateQualityMetrics) {
      try {
        const metrics = await calculateQualityMetrics(
          compressedData.originalBuffer,
          compressedData.buffer
        );
        stats.qualityMetrics.push({
          imageName: xObjectName.toString(),
          ...metrics
        });
      } catch (error) {
        console.warn(`Quality metrics calculation skipped: ${error.message}`);
      }
    }

    // Step 3: Embed compressed image
    const embeddedImage = await embedCompressedImage(pdfDoc, compressedData);

    if (!embeddedImage) {
      console.warn(`Could not embed compressed image, skipping`);
      stats.compressedImagesSize += originalSize;
      return null;
    }

    // Track compressed size
    stats.compressedImagesSize += compressedData.buffer.length;

    // Return the embedded image and reference info for replacement
    return {
      embeddedImage,
      xObjectName,
      originalWidth: width,
      originalHeight: height,
      newWidth: compressedData.width,
      newHeight: compressedData.height
    };

  } catch (error) {
    console.warn(`Failed to compress image: ${error.message}`);
    return null;
  }
}

/**
 * Extract image from PDF and save to temporary file
 */
async function extractImageData(xObject) {
  try {
    // xObject is already looked up - access its dict or use it directly
    const objectDict = xObject?.dict || xObject;
    if (!objectDict) return null;

    // Get image properties - use get() for dict access
    const widthObj = objectDict.get ? objectDict.get(PDFName.of('Width')) : objectDict.lookup(PDFName.of('Width'));
    const heightObj = objectDict.get ? objectDict.get(PDFName.of('Height')) : objectDict.lookup(PDFName.of('Height'));
    const colorSpace = objectDict.get ? objectDict.get(PDFName.of('ColorSpace')) : objectDict.lookup(PDFName.of('ColorSpace'));
    const bitsObj = objectDict.get ? objectDict.get(PDFName.of('BitsPerComponent')) : objectDict.lookup(PDFName.of('BitsPerComponent'));
    const filter = objectDict.get ? objectDict.get(PDFName.of('Filter')) : objectDict.lookup(PDFName.of('Filter'));

    const width = widthObj?.asNumber ? widthObj.asNumber() : (typeof widthObj === 'number' ? widthObj : null);
    const height = heightObj?.asNumber ? heightObj.asNumber() : (typeof heightObj === 'number' ? heightObj : null);
    const bitsPerComponent = bitsObj?.asNumber ? bitsObj.asNumber() : (typeof bitsObj === 'number' ? bitsObj : 8);

    if (!width || !height) {
      return null;
    }

    // Get raw stream bytes
    let imageBytes;
    try {
      // For stream objects, try to access contents
      if (xObject.contents && typeof xObject.contents === 'function') {
        imageBytes = xObject.contents();
      } else if (xObject.contents) {
        imageBytes = xObject.contents;
      } else {
        // No stream data available
        return null;
      }
    } catch (e) {
      console.warn('Could not extract image bytes:', e.message);
      return null;
    }

    if (!imageBytes || imageBytes.length === 0) {
      return null;
    }

    // Determine filter type
    const filterName = filter?.toString();
    let decodedData = imageBytes;

    // Decode based on filter
    if (filterName) {
      if (filterName.includes('FlateDecode') || filterName === '/FlateDecode') {
        try {
          decodedData = pako.inflate(imageBytes);
        } catch (e) {
          console.warn('FlateDecode failed, using raw data:', e.message);
        }
      } else if (filterName.includes('DCTDecode') || filterName === '/DCTDecode') {
        // JPEG data - can use directly
        decodedData = imageBytes;
      }
      // For other filters, we'll try to use raw data
    }

    // Determine color space for Sharp
    const colorSpaceStr = colorSpace?.toString() || '';
    let channels = 3; // Default RGB
    let sharpColorSpace = 'srgb';

    if (colorSpaceStr.includes('DeviceGray') || colorSpaceStr === '/DeviceGray') {
      channels = 1;
      sharpColorSpace = 'b-w';
    } else if (colorSpaceStr.includes('DeviceCMYK') || colorSpaceStr === '/DeviceCMYK') {
      channels = 4;
      sharpColorSpace = 'cmyk';
    } else if (colorSpaceStr.includes('DeviceRGB') || colorSpaceStr === '/DeviceRGB') {
      channels = 3;
      sharpColorSpace = 'srgb';
    }

    // If this is JPEG data (DCTDecode), return it directly for Sharp
    if (filterName && (filterName.includes('DCTDecode') || filterName === '/DCTDecode')) {
      return {
        buffer: Buffer.from(decodedData),
        width,
        height,
        channels,
        colorSpace: sharpColorSpace,
        isJpeg: true
      };
    }

    // For raw pixel data, create a proper buffer for Sharp
    const expectedSize = width * height * channels;
    if (decodedData.length >= expectedSize) {
      return {
        buffer: Buffer.from(decodedData.slice(0, expectedSize)),
        width,
        height,
        channels,
        colorSpace: sharpColorSpace,
        isJpeg: false
      };
    }

    return null;
  } catch (error) {
    console.warn(`Failed to extract image: ${error.message}`);
    return null;
  }
}

/**
 * Compress image buffer using Sharp
 * Supports JPEG, WebP, and PNG formats
 */
async function compressImageBuffer(imageData, settings) {
  try {
    const { buffer, width, height, channels, colorSpace, isJpeg } = imageData;
    const targetDPI = settings.imageDPI;
    const quality = settings.imageQuality;
    const format = settings.imageFormat || 'jpeg'; // Default to JPEG

    // Calculate target dimensions based on DPI
    const scaleFactor = Math.min(1, targetDPI / 300);
    const targetWidth = Math.round(width * scaleFactor);
    const targetHeight = Math.round(height * scaleFactor);

    let sharpImage;

    // Create Sharp instance based on image type
    if (isJpeg) {
      // Already JPEG - can load directly
      sharpImage = sharp(buffer);
    } else {
      // Raw pixel data - need to specify format
      sharpImage = sharp(buffer, {
        raw: {
          width: width,
          height: height,
          channels: channels
        }
      });
    }

    // Resize image
    sharpImage = sharpImage.resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

    // Apply format-specific compression
    let compressedBuffer;
    let actualFormat = format;

    switch (format) {
      case 'webp':
        // WebP typically provides better compression than JPEG
        compressedBuffer = await sharpImage
          .webp({
            quality: quality,
            effort: 6, // Balance between speed and compression
            smartSubsample: true
          })
          .toBuffer();
        break;

      case 'png':
        // Lossless PNG compression
        compressedBuffer = await sharpImage
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: quality < 80 // Use palette for lower quality settings
          })
          .toBuffer();
        break;

      case 'jpeg':
      default:
        // JPEG compression (default)
        compressedBuffer = await sharpImage
          .jpeg({
            quality: quality,
            progressive: true,
            mozjpeg: true,
            optimizeScans: true
          })
          .toBuffer();
        actualFormat = 'jpeg';
        break;
    }

    return {
      buffer: compressedBuffer,
      width: targetWidth,
      height: targetHeight,
      format: actualFormat,
      originalBuffer: buffer // Keep for quality comparison
    };
  } catch (error) {
    throw new Error(`Sharp compression failed: ${error.message}`);
  }
}

/**
 * Embed compressed image back into PDF
 */
async function embedCompressedImage(pdfDoc, compressedData) {
  try {
    const { buffer, width, height } = compressedData;

    // Try to embed as JPEG first (our compression outputs JPEG)
    try {
      const image = await pdfDoc.embedJpg(buffer);
      return image;
    } catch (jpgError) {
      // If JPEG embedding fails, try PNG
      try {
        const image = await pdfDoc.embedPng(buffer);
        return image;
      } catch (pngError) {
        throw new Error(`Failed to embed image as JPG or PNG: ${jpgError.message}`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to embed compressed image: ${error.message}`);
  }
}

module.exports = {
  compressImages,
  compressImageBuffer,
  extractImageData,
  embedCompressedImage
};
