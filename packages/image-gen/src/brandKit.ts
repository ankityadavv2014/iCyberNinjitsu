import type { BrandConfig } from './types.js';

/**
 * Default iCyberNinjitsu brand configuration for cybersecurity content.
 */
export const DEFAULT_BRAND: BrandConfig = {
  name: 'iCyberNinjitsu',
  tagline: 'Cybersecurity Intelligence',
  primaryColor: '#0ea5e9',    // sky-500
  secondaryColor: '#1e293b',  // slate-800
  accentColor: '#22d3ee',     // cyan-400
  gradientFrom: '#0f172a',    // slate-900
  gradientTo: '#1e3a5f',      // dark blue
  watermarkText: 'icyberninjitsu.com',
};

/**
 * Merge user brand overrides with defaults.
 */
export function resolveBrand(overrides?: Partial<BrandConfig>): BrandConfig {
  return { ...DEFAULT_BRAND, ...overrides };
}

/**
 * Extract a short headline from post content.
 * Takes the first meaningful line (non-empty, non-hashtag).
 */
export function extractHeadline(content: string, maxLength = 80): string {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Skip lines that are only hashtags
    if (/^#\S/.test(line) && !line.includes(' ')) continue;
    // Skip very short lines
    if (line.length < 10) continue;
    // Return truncated
    return line.length > maxLength ? line.slice(0, maxLength - 3) + '...' : line;
  }
  return lines[0]?.slice(0, maxLength) ?? 'Cybersecurity Update';
}

/**
 * Extract hashtags from content.
 */
export function extractHashtags(content: string, max = 4): string[] {
  const matches = content.match(/#\w+/g) ?? [];
  return [...new Set(matches)].slice(0, max);
}

/**
 * Build an AI image prompt from post content.
 */
export function buildImagePrompt(content: string, headline: string): string {
  // Extract key cybersecurity concepts for the prompt
  const keywords = [
    'cybersecurity', 'ransomware', 'malware', 'phishing', 'vulnerability',
    'data breach', 'threat', 'firewall', 'encryption', 'hacker', 'CISA',
    'zero-day', 'exploit', 'security', 'attack', 'defense', 'protection',
    'network', 'cloud security', 'AI security',
  ];

  const found = keywords.filter((kw) =>
    content.toLowerCase().includes(kw.toLowerCase())
  );

  const context = found.length > 0
    ? found.slice(0, 3).join(', ')
    : 'cybersecurity and digital protection';

  return `Professional cybersecurity themed illustration for a LinkedIn post about: ${headline}. Context: ${context}. Style: modern, clean, dark blue gradient background, digital network nodes, shield icons, abstract technology patterns. Professional corporate look, suitable for business social media. No text in image.`;
}
