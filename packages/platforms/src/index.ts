export type { PlatformId, PublishResult, RenderedDraft, ConnectResult, RateLimitPolicy, Capability } from './types.js';
export type { PlatformPlugin, CredentialBag } from './interface.js';
export { getPlatform, getPlatformOrThrow } from './registry.js';
export { linkedInPlatform } from './adapters/linkedin.js';
export { xPlatform } from './adapters/x.js';
