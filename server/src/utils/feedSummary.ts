// Strips common Markdown syntax from post content so an Atom <summary> reads
// as plain text (a syndication feed has no renderer to hand raw Markdown to).
// No isomorphic content->plain-text helper exists server-side (see
// client/src/utils/markdown.js's markdownToPlainText, which depends on DOM
// APIs and can't run here), so this is a small server-only equivalent.
const DEFAULT_SUMMARY_LENGTH = 300;

export const toFeedSummary = (content: string, maxLength: number = DEFAULT_SUMMARY_LENGTH): string => {
  const plain = (content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
};
