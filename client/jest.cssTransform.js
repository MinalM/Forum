// Custom Jest transformer turning CSS imports into empty modules, mirroring
// react-scripts' config/jest/cssTransform.js — but returning { code } per
// Jest 28+'s transformer protocol (react-scripts's version predates that
// and returns a bare string). Only plain (non-module) CSS imports exist in
// src/, so this is the whole transform — no CSS Modules support (no
// `identity-obj-proxy` moduleNameMapper) is needed.
module.exports = {
  process() {
    return { code: 'module.exports = {};' };
  },
  getCacheKey() {
    return 'cssTransform';
  }
};
