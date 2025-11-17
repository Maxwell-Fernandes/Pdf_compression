const { calculatePSNR, calculateSSIM, calculateQualityMetrics } = require('../src/utils/qualityMetrics');
const sharp = require('sharp');

describe('Quality Metrics', () => {
  let testImage1, testImage2;

  beforeAll(async () => {
    // Create identical test images
    testImage1 = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
      .jpeg()
      .toBuffer();

    testImage2 = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
      .jpeg()
      .toBuffer();
  });

  describe('PSNR Calculation', () => {
    test('should return high PSNR for similar images', async () => {
      // Use JPEG images for the test since calculatePSNR uses sharp to load them
      const psnr = await calculatePSNR(testImage1, testImage2);
      expect(psnr).toBeGreaterThan(30); // Very high quality for similar images
    });

    test('should return lower PSNR for different images', async () => {
      const differentImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .jpeg()
        .toBuffer();

      const psnr = await calculatePSNR(testImage1, differentImage);
      expect(psnr).toBeGreaterThan(0);
      expect(psnr).toBeLessThan(40); // Lower quality due to significant differences
    });
  });

  describe('SSIM Calculation', () => {
    test('should return close to 1 for similar images', async () => {
      const ssim = await calculateSSIM(testImage1, testImage2);
      expect(ssim).toBeGreaterThan(0.9);
      expect(ssim).toBeLessThanOrEqual(1);
    });

    test('should return lower SSIM for different images', async () => {
      const differentImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }
        }
      })
        .jpeg()
        .toBuffer();

      const ssim = await calculateSSIM(testImage1, differentImage);
      expect(ssim).toBeGreaterThan(0);
      expect(ssim).toBeLessThan(0.98); // Adjusted threshold
    });
  });

  describe('Comprehensive Quality Metrics', () => {
    test('should calculate both PSNR and SSIM', async () => {
      const metrics = await calculateQualityMetrics(testImage1, testImage2);

      expect(metrics).toHaveProperty('psnr');
      expect(metrics).toHaveProperty('ssim');
      expect(metrics).toHaveProperty('quality');
      expect(metrics).toHaveProperty('interpretation');

      expect(metrics.psnr).toBeGreaterThan(0);
      expect(metrics.ssim).toBeGreaterThan(0);
      expect(metrics.quality).toBeDefined();
    });

    test('should provide quality rating', async () => {
      const metrics = await calculateQualityMetrics(testImage1, testImage2);
      expect(['excellent', 'very-good', 'good', 'acceptable', 'poor']).toContain(metrics.quality);
    });
  });
});
