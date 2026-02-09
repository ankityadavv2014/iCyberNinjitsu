import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { resolveBrand, extractHeadline, extractHashtags } from './brandKit.js';
import type { BrandConfig, ImageGenResult } from './types.js';

/**
 * Render a branded template card as a PNG image using Satori (SVG) + Resvg (PNG).
 * No browser or Puppeteer needed -- pure Node.js rendering.
 */
export async function renderTemplate(opts: {
  headline?: string;
  content: string;
  sourceTitle?: string;
  brand?: Partial<BrandConfig>;
  width?: number;
  height?: number;
}): Promise<ImageGenResult> {
  const brand = resolveBrand(opts.brand);
  const width = opts.width ?? 1200;
  const height = opts.height ?? 630;
  const headline = opts.headline ?? extractHeadline(opts.content);
  const hashtags = extractHashtags(opts.content);

  // Build the JSX-like element tree for Satori
  // Satori uses a subset of CSS -- flexbox only, no grid
  const element = {
    type: 'div' as const,
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'space-between' as const,
        padding: '60px',
        background: `linear-gradient(135deg, ${brand.gradientFrom} 0%, ${brand.gradientTo} 50%, ${brand.secondaryColor} 100%)`,
        fontFamily: 'sans-serif',
        color: '#ffffff',
        position: 'relative' as const,
      },
      children: [
        // Grid pattern overlay (decorative dots)
        {
          type: 'div' as const,
          props: {
            style: {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            },
            children: [],
          },
        },
        // Top: brand name + accent line
        {
          type: 'div' as const,
          props: {
            style: {
              display: 'flex',
              alignItems: 'center' as const,
              gap: '16px',
            },
            children: [
              {
                type: 'div' as const,
                props: {
                  style: {
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: brand.accentColor,
                    display: 'flex',
                    alignItems: 'center' as const,
                    justifyContent: 'center' as const,
                    fontSize: '20px',
                    fontWeight: 700,
                    color: brand.gradientFrom,
                  },
                  children: 'A',
                },
              },
              {
                type: 'div' as const,
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                  },
                  children: [
                    {
                      type: 'span' as const,
                      props: {
                        style: { fontSize: '18px', fontWeight: 700, letterSpacing: '0.05em' },
                        children: brand.name.toUpperCase(),
                      },
                    },
                    {
                      type: 'span' as const,
                      props: {
                        style: { fontSize: '12px', color: brand.accentColor, letterSpacing: '0.1em' },
                        children: brand.tagline ?? '',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Center: headline
        {
          type: 'div' as const,
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              gap: '16px',
              flex: 1,
              justifyContent: 'center' as const,
            },
            children: [
              // Accent bar
              {
                type: 'div' as const,
                props: {
                  style: {
                    width: '60px',
                    height: '4px',
                    borderRadius: '2px',
                    background: brand.accentColor,
                  },
                  children: [],
                },
              },
              // Headline text
              {
                type: 'div' as const,
                props: {
                  style: {
                    fontSize: headline.length > 60 ? '32px' : '40px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    maxHeight: '200px',
                    overflow: 'hidden' as const,
                  },
                  children: headline,
                },
              },
              // Source title (if any)
              ...(opts.sourceTitle
                ? [
                    {
                      type: 'div' as const,
                      props: {
                        style: {
                          fontSize: '16px',
                          color: 'rgba(255,255,255,0.6)',
                          marginTop: '8px',
                        },
                        children: opts.sourceTitle.length > 80
                          ? opts.sourceTitle.slice(0, 77) + '...'
                          : opts.sourceTitle,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        // Bottom: hashtags + watermark
        {
          type: 'div' as const,
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between' as const,
              alignItems: 'flex-end' as const,
            },
            children: [
              // Hashtags
              {
                type: 'div' as const,
                props: {
                  style: {
                    display: 'flex',
                    gap: '8px',
                  },
                  children: hashtags.map((tag) => ({
                    type: 'span' as const,
                    props: {
                      style: {
                        fontSize: '14px',
                        color: brand.accentColor,
                        background: 'rgba(34,211,238,0.1)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        border: `1px solid rgba(34,211,238,0.2)`,
                      },
                      children: tag,
                    },
                  })),
                },
              },
              // Watermark
              {
                type: 'span' as const,
                props: {
                  style: {
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.05em',
                  },
                  children: brand.watermarkText ?? '',
                },
              },
            ],
          },
        },
      ],
    },
  };

  // Render to SVG using Satori
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width,
    height,
    fonts: [
      {
        name: 'sans-serif',
        // Use a system font buffer -- Satori needs at least one font
        // We'll load Inter from a CDN on first use
        data: await loadDefaultFont(),
        weight: 400,
        style: 'normal',
      },
      {
        name: 'sans-serif',
        data: await loadDefaultFont(700),
        weight: 700,
        style: 'normal',
      },
    ],
  });

  // Convert SVG to PNG using Resvg
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
  });
  const pngData = resvg.render();
  const buffer = Buffer.from(pngData.asPng());

  return {
    buffer,
    mimeType: 'image/png',
    method: 'template',
    width,
    height,
  };
}

// Font cache
let fontCache400: ArrayBuffer | null = null;
let fontCache700: ArrayBuffer | null = null;

async function loadDefaultFont(weight: 400 | 700 = 400): Promise<ArrayBuffer> {
  if (weight === 400 && fontCache400) return fontCache400;
  if (weight === 700 && fontCache700) return fontCache700;

  // Load Inter font from Google Fonts CDN
  const url = weight === 700
    ? 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff'
    : 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff';

  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    if (weight === 700) fontCache700 = buf;
    else fontCache400 = buf;
    return buf;
  } catch {
    // Fallback: create a minimal valid font buffer (Satori requires it)
    // This will render with default glyphs
    console.warn('[image-gen] Could not load Inter font, using fallback');
    const fallback = new ArrayBuffer(0);
    if (weight === 700) fontCache700 = fallback;
    else fontCache400 = fallback;
    return fallback;
  }
}
