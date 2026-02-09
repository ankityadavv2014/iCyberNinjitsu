import type { PlatformPlugin } from './interface.js';
import type { PlatformId } from './types.js';
import { linkedInPlatform } from './adapters/linkedin.js';
import { xPlatform } from './adapters/x.js';

const registry: Record<string, PlatformPlugin> = {
  linkedin: linkedInPlatform,
  x: xPlatform,
};

export function getPlatform(platformId: PlatformId | string): PlatformPlugin | null {
  return registry[platformId] ?? null;
}

export function getPlatformOrThrow(platformId: PlatformId | string): PlatformPlugin {
  const p = getPlatform(platformId);
  if (!p) throw new Error(`Unknown platform: ${platformId}`);
  return p;
}
