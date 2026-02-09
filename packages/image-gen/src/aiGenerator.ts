import { buildImagePrompt, extractHeadline } from './brandKit.js';
import type { ImageGenResult } from './types.js';

/**
 * Generate an image using Pollinations.ai (free, no API key required).
 * Falls back gracefully if the service is unavailable.
 */
export async function generateAIImage(opts: {
  content: string;
  headline?: string;
  width?: number;
  height?: number;
}): Promise<ImageGenResult | null> {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 630;
  const headline = opts.headline ?? extractHeadline(opts.content);
  const prompt = buildImagePrompt(opts.content, headline);

  // Pollinations.ai generates images from text prompts -- free, no auth
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!res.ok) {
      console.warn(`[image-gen] Pollinations.ai returned ${res.status}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify we got a real image (at least 1KB)
    if (buffer.length < 1024) {
      console.warn('[image-gen] Pollinations.ai returned too-small response');
      return null;
    }

    return {
      buffer,
      mimeType: 'image/png',
      method: 'ai',
      prompt,
      width,
      height,
    };
  } catch (err) {
    console.warn('[image-gen] Pollinations.ai failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
