import type { BrandConfig, ImageGenResult } from './types.js';
import { resolveBrand } from './brandKit.js';

/**
 * Overlay brand watermark on an AI-generated image.
 * Uses sharp for image compositing.
 */
export async function compositeWithBrand(
  aiImage: ImageGenResult,
  brand?: Partial<BrandConfig>,
): Promise<ImageGenResult> {
  const b = resolveBrand(brand);
  const { width, height } = aiImage;

  try {
    const sharp = (await import('sharp')).default;

    // Create a semi-transparent brand footer bar
    const footerHeight = 60;
    const footerSvg = `
      <svg width="${width}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${footerHeight}" fill="rgba(15,23,42,0.85)" />
        <rect width="4" height="${footerHeight}" fill="${b.accentColor}" />
        <text x="20" y="38" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff" letter-spacing="0.05em">
          ${escapeXml(b.name.toUpperCase())}
        </text>
        <text x="${width - 20}" y="38" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.5)" text-anchor="end">
          ${escapeXml(b.tagline ?? '')}
        </text>
      </svg>
    `;

    const footerBuffer = Buffer.from(footerSvg);

    // Composite: original image + brand footer at bottom
    const result = await sharp(aiImage.buffer)
      .resize(width, height, { fit: 'cover' })
      .composite([
        {
          input: await sharp(footerBuffer).png().toBuffer(),
          gravity: 'south',
        },
      ])
      .png()
      .toBuffer();

    return {
      buffer: result,
      mimeType: 'image/png',
      method: 'composite',
      prompt: aiImage.prompt,
      width,
      height,
    };
  } catch (err) {
    console.warn('[image-gen] Composite failed, returning original:', err instanceof Error ? err.message : String(err));
    // Return AI image as-is if compositing fails
    return { ...aiImage, method: 'composite' };
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
