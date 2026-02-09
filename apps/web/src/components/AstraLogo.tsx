/**
 * iCyberNinjitsu Logo System
 *
 * Variants:
 *   A. ICNLogo        — figure only (no text), used everywhere as the icon
 *   B. ICNLogoFull    — icon + "iCyberNinjitsu" text lockup (landing, marketing)
 *   C. ICNLogoCompact — icon + "iCN" (collapsed sidebar, small headers)
 *   D. ICNMonogram    — "iN" text mark (favicon-grade, tiny spaces)
 */

import Image from 'next/image';

/* ── A. Primary icon — figure only (clean image, no text) ── */
export function ICNLogo({
  size = 24,
  animated = false,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${animated ? 'icn-logo-glow' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label="iCyberNinjitsu"
      role="img"
    >
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </span>
  );
}

/* ── B. Full lockup — icon + brand name (landing hero, marketing) ── */
export function ICNLogoFull({
  size = 32,
  animated = false,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="iCyberNinjitsu">
      <ICNLogo size={size} animated={animated} />
      <span className="text-lg font-semibold tracking-tight text-white">iCyberNinjitsu</span>
    </span>
  );
}

/* ── C. Compact lockup — icon + "iCN" (collapsed sidebar, small headers) ── */
export function ICNLogoCompact({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label="iCyberNinjitsu">
      <ICNLogo size={size} />
      <span className="text-xs font-bold tracking-wide text-current opacity-70">iCN</span>
    </span>
  );
}

/* ── D. Monogram mark — tiny "iN" for favicon-grade spots ── */
export function ICNMonogram({
  size = 20,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-blue-600 text-white font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-label="iCyberNinjitsu"
    >
      iN
    </span>
  );
}

/* ── Legacy alias so existing imports don't break ── */
export const AstraLogo = ICNLogo;
export const AstraLogoMark = ICNMonogram;
