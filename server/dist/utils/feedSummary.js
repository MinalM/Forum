"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFeedSummary = void 0;
const DEFAULT_SUMMARY_LENGTH = 300;
const toFeedSummary = (content, maxLength = DEFAULT_SUMMARY_LENGTH) => {
    const plain = (content || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/[*_~>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (plain.length <= maxLength)
        return plain;
    return `${plain.slice(0, maxLength - 1).trimEnd()}…`;
};
exports.toFeedSummary = toFeedSummary;
//# sourceMappingURL=feedSummary.js.map