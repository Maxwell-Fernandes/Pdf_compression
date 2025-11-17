const sharp = require('sharp');

/**
 * Calculate quality metrics for image compression
 * Implements PSNR (Peak Signal-to-Noise Ratio) and SSIM (Structural Similarity Index)
 * Based on research: M. Nair (2023) "Review of Image Quality Assessment Methods for Compressed Images"
 */

/**
 * Calculate Peak Signal-to-Noise Ratio (PSNR)
 * Higher PSNR indicates better quality (typically 30-50 dB is good)
 *
 * @param {Buffer} originalImage - Original image buffer
 * @param {Buffer} compressedImage - Compressed image buffer
 * @returns {Promise<number>} PSNR value in dB
 */
async function calculatePSNR(originalImage, compressedImage) {
  try {
    // Ensure both images are same size and format
    const original = await sharp(originalImage)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const compressed = await sharp(compressedImage)
      .resize(original.info.width, original.info.height)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const originalData = original.data;
    const compressedData = compressed.data;

    // Calculate Mean Squared Error (MSE)
    let mse = 0;
    const n = originalData.length;

    for (let i = 0; i < n; i++) {
      const diff = originalData[i] - compressedData[i];
      mse += diff * diff;
    }

    mse /= n;

    // Avoid division by zero
    if (mse === 0) {
      return Infinity; // Perfect match
    }

    // Calculate PSNR
    // MAX_PIXEL = 255 for 8-bit images
    const MAX_PIXEL = 255;
    const psnr = 10 * Math.log10((MAX_PIXEL * MAX_PIXEL) / mse);

    return psnr;
  } catch (error) {
    throw new Error(`PSNR calculation failed: ${error.message}`);
  }
}

/**
 * Calculate Structural Similarity Index (SSIM)
 * Values range from -1 to 1, where 1 means identical images
 * Typically > 0.95 is considered very good quality
 *
 * @param {Buffer} originalImage - Original image buffer
 * @param {Buffer} compressedImage - Compressed image buffer
 * @returns {Promise<number>} SSIM value (0-1)
 */
async function calculateSSIM(originalImage, compressedImage) {
  try {
    // Ensure both images are same size and format
    const original = await sharp(originalImage)
      .greyscale() // Convert to greyscale for simpler SSIM calculation
      .raw()
      .toBuffer({ resolveWithObject: true });

    const compressed = await sharp(compressedImage)
      .greyscale()
      .resize(original.info.width, original.info.height)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = original.info.width;
    const height = original.info.height;

    // SSIM constants
    const K1 = 0.01;
    const K2 = 0.03;
    const L = 255; // Dynamic range for 8-bit images
    const C1 = (K1 * L) ** 2;
    const C2 = (K2 * L) ** 2;

    // Calculate statistics for the entire image (simplified version)
    const stats1 = calculateImageStats(original.data);
    const stats2 = calculateImageStats(compressed.data);

    // Calculate covariance
    const covariance = calculateCovariance(original.data, compressed.data, stats1.mean, stats2.mean);

    // SSIM formula
    const numerator = (2 * stats1.mean * stats2.mean + C1) * (2 * covariance + C2);
    const denominator = (stats1.mean ** 2 + stats2.mean ** 2 + C1) *
                       (stats1.variance + stats2.variance + C2);

    const ssim = numerator / denominator;

    return Math.max(0, Math.min(1, ssim)); // Clamp between 0 and 1
  } catch (error) {
    throw new Error(`SSIM calculation failed: ${error.message}`);
  }
}

/**
 * Calculate mean and variance for an image
 */
function calculateImageStats(imageData) {
  const n = imageData.length;

  // Calculate mean
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += imageData[i];
  }
  const mean = sum / n;

  // Calculate variance
  let varianceSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = imageData[i] - mean;
    varianceSum += diff * diff;
  }
  const variance = varianceSum / n;

  return { mean, variance };
}

/**
 * Calculate covariance between two images
 */
function calculateCovariance(data1, data2, mean1, mean2) {
  const n = data1.length;
  let covariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (data1[i] - mean1) * (data2[i] - mean2);
  }

  return covariance / n;
}

/**
 * Calculate comprehensive quality metrics for an image pair
 *
 * @param {Buffer} originalImage - Original image buffer
 * @param {Buffer} compressedImage - Compressed image buffer
 * @returns {Promise<Object>} Quality metrics including PSNR and SSIM
 */
async function calculateQualityMetrics(originalImage, compressedImage) {
  try {
    const metrics = {
      psnr: null,
      ssim: null,
      quality: null, // Overall quality rating
      interpretation: null
    };

    // Calculate PSNR
    try {
      metrics.psnr = await calculatePSNR(originalImage, compressedImage);
    } catch (error) {
      console.warn(`PSNR calculation skipped: ${error.message}`);
    }

    // Calculate SSIM
    try {
      metrics.ssim = await calculateSSIM(originalImage, compressedImage);
    } catch (error) {
      console.warn(`SSIM calculation skipped: ${error.message}`);
    }

    // Determine overall quality rating
    metrics.quality = determineQualityRating(metrics.psnr, metrics.ssim);
    metrics.interpretation = getQualityInterpretation(metrics.psnr, metrics.ssim);

    return metrics;
  } catch (error) {
    throw new Error(`Quality metrics calculation failed: ${error.message}`);
  }
}

/**
 * Determine overall quality rating based on PSNR and SSIM
 */
function determineQualityRating(psnr, ssim) {
  // Priority: SSIM > PSNR (SSIM correlates better with human perception)
  if (ssim !== null) {
    if (ssim >= 0.98) return 'excellent';
    if (ssim >= 0.95) return 'very-good';
    if (ssim >= 0.90) return 'good';
    if (ssim >= 0.80) return 'acceptable';
    return 'poor';
  }

  if (psnr !== null) {
    if (psnr === Infinity) return 'excellent';
    if (psnr >= 40) return 'excellent';
    if (psnr >= 35) return 'very-good';
    if (psnr >= 30) return 'good';
    if (psnr >= 25) return 'acceptable';
    return 'poor';
  }

  return 'unknown';
}

/**
 * Get human-readable interpretation of quality metrics
 */
function getQualityInterpretation(psnr, ssim) {
  const interpretations = [];

  if (psnr !== null) {
    if (psnr === Infinity) {
      interpretations.push('PSNR: Identical images (perfect quality)');
    } else if (psnr >= 40) {
      interpretations.push(`PSNR: ${psnr.toFixed(2)} dB (excellent - imperceptible differences)`);
    } else if (psnr >= 35) {
      interpretations.push(`PSNR: ${psnr.toFixed(2)} dB (very good - minor differences)`);
    } else if (psnr >= 30) {
      interpretations.push(`PSNR: ${psnr.toFixed(2)} dB (good - acceptable quality)`);
    } else if (psnr >= 25) {
      interpretations.push(`PSNR: ${psnr.toFixed(2)} dB (acceptable - visible artifacts)`);
    } else {
      interpretations.push(`PSNR: ${psnr.toFixed(2)} dB (poor - significant degradation)`);
    }
  }

  if (ssim !== null) {
    if (ssim >= 0.98) {
      interpretations.push(`SSIM: ${ssim.toFixed(4)} (excellent - nearly identical structure)`);
    } else if (ssim >= 0.95) {
      interpretations.push(`SSIM: ${ssim.toFixed(4)} (very good - high similarity)`);
    } else if (ssim >= 0.90) {
      interpretations.push(`SSIM: ${ssim.toFixed(4)} (good - acceptable similarity)`);
    } else if (ssim >= 0.80) {
      interpretations.push(`SSIM: ${ssim.toFixed(4)} (acceptable - noticeable differences)`);
    } else {
      interpretations.push(`SSIM: ${ssim.toFixed(4)} (poor - significant structural changes)`);
    }
  }

  return interpretations.join('; ');
}

/**
 * Calculate quality metrics for multiple images
 */
async function calculateBatchQualityMetrics(imagePairs) {
  const results = [];

  for (const { original, compressed, name } of imagePairs) {
    try {
      const metrics = await calculateQualityMetrics(original, compressed);
      results.push({
        name,
        ...metrics
      });
    } catch (error) {
      results.push({
        name,
        error: error.message
      });
    }
  }

  // Calculate average metrics
  const validResults = results.filter(r => r.psnr !== null || r.ssim !== null);

  if (validResults.length > 0) {
    const avgPsnr = validResults
      .filter(r => r.psnr !== null && r.psnr !== Infinity)
      .reduce((sum, r) => sum + r.psnr, 0) / validResults.filter(r => r.psnr !== null && r.psnr !== Infinity).length;

    const avgSsim = validResults
      .filter(r => r.ssim !== null)
      .reduce((sum, r) => sum + r.ssim, 0) / validResults.filter(r => r.ssim !== null).length;

    return {
      individual: results,
      average: {
        psnr: avgPsnr || null,
        ssim: avgSsim || null,
        quality: determineQualityRating(avgPsnr, avgSsim)
      }
    };
  }

  return {
    individual: results,
    average: null
  };
}

module.exports = {
  calculatePSNR,
  calculateSSIM,
  calculateQualityMetrics,
  calculateBatchQualityMetrics,
  determineQualityRating,
  getQualityInterpretation
};
