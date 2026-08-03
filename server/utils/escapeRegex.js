// Escape characters with special meaning in regular expressions so user
// input can be safely interpolated into a RegExp (e.g. search queries).
const escapeRegex = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
