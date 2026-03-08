"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordForSentinel = recordForSentinel;
const axios_1 = __importDefault(require("axios"));
const SENTINEL_URL = process.env.SENTINEL_URL || 'http://localhost:8100';
const SENTINEL_TOKEN = process.env.SENTINEL_AUTH_TOKEN || '';
const SENTINEL_EXPERIMENT_ID = process.env.SENTINEL_EXPERIMENT_ID || '';
const SENTINEL_ARM_ID = process.env.SENTINEL_ARM_ID || 'control';
let buffer = [];
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_SIZE = 500;
async function flush() {
    if (buffer.length === 0 || !SENTINEL_EXPERIMENT_ID || !SENTINEL_TOKEN)
        return;
    const batch = buffer.splice(0, FLUSH_SIZE);
    try {
        await axios_1.default.post(`${SENTINEL_URL}/api/v1/experiments/${SENTINEL_EXPERIMENT_ID}/events`, { events: batch }, {
            headers: {
                Authorization: `Bearer ${SENTINEL_TOKEN}`,
                'Content-Type': 'application/json',
            },
            timeout: 5000,
        });
    }
    catch (err) {
        console.warn('Sentinel flush failed:', err.message);
    }
}
const isTest = process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';
if (!isTest) {
    setInterval(flush, FLUSH_INTERVAL_MS);
}
function recordForSentinel(durationMs) {
    if (!SENTINEL_EXPERIMENT_ID || !SENTINEL_TOKEN)
        return;
    buffer.push({
        arm_id: SENTINEL_ARM_ID,
        timestamp: new Date().toISOString(),
        measure: 'response_time_ms',
        value: durationMs,
    });
    if (buffer.length >= FLUSH_SIZE) {
        flush();
    }
}
//# sourceMappingURL=sentinel-reporter.js.map