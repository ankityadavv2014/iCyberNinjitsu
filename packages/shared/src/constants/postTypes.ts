export const POST_TYPES = ['insight', 'how-to', 'news', 'contrarian', 'thread'] as const;
export type PostType = (typeof POST_TYPES)[number];
