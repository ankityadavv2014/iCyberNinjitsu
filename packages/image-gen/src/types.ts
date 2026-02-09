export interface BrandConfig {
  name: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  watermarkText?: string;
}

export interface ImageGenRequest {
  /** Post content to extract context from */
  postContent: string;
  /** Post headline / title (if available) */
  headline?: string;
  /** Source article URL */
  sourceUrl?: string;
  /** Source article title */
  sourceTitle?: string;
  /** Brand configuration overrides */
  brand?: Partial<BrandConfig>;
  /** Preferred method: 'template' | 'ai' | 'composite' | 'auto' */
  method?: 'template' | 'ai' | 'composite' | 'auto';
  /** Image dimensions */
  width?: number;
  height?: number;
}

export interface ImageGenResult {
  /** Raw image buffer (PNG) */
  buffer: Buffer;
  /** MIME type */
  mimeType: 'image/png';
  /** Which method was used */
  method: 'template' | 'ai' | 'composite';
  /** AI prompt used (if applicable) */
  prompt?: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}
