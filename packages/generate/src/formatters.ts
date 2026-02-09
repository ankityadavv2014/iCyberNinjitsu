/**
 * Platform-specific post formatters.
 *
 * LinkedIn (and most social platforms) render text literally -- they don't
 * interpret markdown.  The LLM often outputs **bold**, *italic*, and
 * [link](url) syntax that looks ugly when printed verbatim.
 *
 * Each formatter cleans output for its target platform.
 */

/**
 * Strip markdown artifacts that look bad when printed as plain text.
 * Keeps hashtags, line breaks, and emojis intact.
 */
export function stripMarkdownForLinkedIn(text: string): string {
  let out = text;

  // Remove bold / italic wrappers: **text** → text,  __text__ → text
  out = out.replace(/\*{2,3}(.+?)\*{2,3}/g, '$1');
  out = out.replace(/_{2,3}(.+?)_{2,3}/g, '$1');

  // Remove single-star italic that isn't a bullet:  *text* → text
  // but keep lines starting with "* " (bullet lists)
  out = out.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '$1');
  out = out.replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '$1');

  // Convert [text](url) links → text (url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // Remove heading markers: ### Heading → Heading
  out = out.replace(/^#{1,6}\s+/gm, '');

  // Remove horizontal rules
  out = out.replace(/^[-*_]{3,}\s*$/gm, '');

  // Remove inline code backticks: `code` → code
  out = out.replace(/`([^`]+)`/g, '$1');

  // Collapse triple+ newlines into double
  out = out.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  out = out.trim();

  return out;
}

/**
 * Generic formatter that preserves markdown (for platforms that support it).
 */
export function keepMarkdown(text: string): string {
  return text.trim();
}

/**
 * Strip for Twitter/X -- also enforce 280 char limit.
 */
export function formatForTwitter(text: string): string {
  let out = stripMarkdownForLinkedIn(text);
  // Twitter has 280 char limit -- truncate intelligently
  if (out.length > 280) {
    out = out.slice(0, 277) + '...';
  }
  return out;
}

/**
 * Get the appropriate formatter for a platform.
 */
export function getFormatter(platform: string): (text: string) => string {
  switch (platform.toLowerCase()) {
    case 'linkedin':
      return stripMarkdownForLinkedIn;
    case 'twitter':
    case 'x':
      return formatForTwitter;
    default:
      return stripMarkdownForLinkedIn; // safe default: strip markdown
  }
}
