export * from './types.js';
export * from './brandKit.js';
export * from './templateRenderer.js';
export * from './aiGenerator.js';
export * from './composite.js';

import { renderTemplate } from './templateRenderer.js';
import { generateAIImage } from './aiGenerator.js';
import { compositeWithBrand } from './composite.js';
import type { ImageGenRequest, ImageGenResult, BrandConfig } from './types.js';
import { extractHeadline } from './brandKit.js';

/**
 * Main entry point: generate a post image using the best available method.
 *
 * Strategy (method = 'auto'):
 *   1. Try AI generation (Pollinations.ai) for a contextual hero image
 *   2. If AI succeeds, composite brand overlay on top
 *   3. If AI fails, fall back to branded template card
 */
export async function generatePostImage(req: ImageGenRequest): Promise<ImageGenResult> {
  const method = req.method ?? 'auto';
  const headline = req.headline ?? extractHeadline(req.postContent);
  const width = req.width ?? 1200;
  const height = req.height ?? 630;

  // Template-only mode
  if (method === 'template') {
    return renderTemplate({
      headline,
      content: req.postContent,
      sourceTitle: req.sourceTitle,
      brand: req.brand,
      width,
      height,
    });
  }

  // AI-only mode
  if (method === 'ai') {
    const aiResult = await generateAIImage({ content: req.postContent, headline, width, height });
    if (aiResult) return aiResult;
    // Fall back to template
    console.log('[image-gen] AI mode failed, falling back to template');
    return renderTemplate({ headline, content: req.postContent, sourceTitle: req.sourceTitle, brand: req.brand, width, height });
  }

  // Composite mode: AI + brand overlay
  if (method === 'composite') {
    const aiResult = await generateAIImage({ content: req.postContent, headline, width, height });
    if (aiResult) {
      return compositeWithBrand(aiResult, req.brand);
    }
    return renderTemplate({ headline, content: req.postContent, sourceTitle: req.sourceTitle, brand: req.brand, width, height });
  }

  // Auto mode: try composite (AI + brand), fall back to template
  const aiResult = await generateAIImage({ content: req.postContent, headline, width, height });
  if (aiResult) {
    try {
      return await compositeWithBrand(aiResult, req.brand);
    } catch {
      return aiResult; // Return raw AI image if composite fails
    }
  }

  // Final fallback: branded template
  console.log('[image-gen] All AI methods failed, using branded template');
  return renderTemplate({
    headline,
    content: req.postContent,
    sourceTitle: req.sourceTitle,
    brand: req.brand,
    width,
    height,
  });
}
