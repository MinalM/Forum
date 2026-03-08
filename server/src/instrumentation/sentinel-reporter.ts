import axios from 'axios';

const SENTINEL_URL = process.env.SENTINEL_URL || 'http://localhost:8100';
const SENTINEL_TOKEN = process.env.SENTINEL_AUTH_TOKEN || '';
const SENTINEL_EXPERIMENT_ID = process.env.SENTINEL_EXPERIMENT_ID || '';
const SENTINEL_ARM_ID = process.env.SENTINEL_ARM_ID || 'control';

interface SentinelEvent {
  arm_id: string;
  timestamp: string;
  measure: string;
  value: number;
}

let buffer: SentinelEvent[] = [];

const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_SIZE = 500;

async function flush(): Promise<void> {
  if (buffer.length === 0 || !SENTINEL_EXPERIMENT_ID || !SENTINEL_TOKEN) return;
  const batch = buffer.splice(0, FLUSH_SIZE);
  try {
    await axios.post(
      `${SENTINEL_URL}/api/v1/experiments/${SENTINEL_EXPERIMENT_ID}/events`,
      { events: batch },
      {
        headers: {
          Authorization: `Bearer ${SENTINEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
  } catch (err: any) {
    console.warn('Sentinel flush failed:', err.message);
  }
}

// Don't start the interval under Jest or when NODE_ENV=test so Jest can exit (no open handles)
const isTest =
  process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';
if (!isTest) {
  setInterval(flush, FLUSH_INTERVAL_MS);
}

export function recordForSentinel(durationMs: number): void {
  if (!SENTINEL_EXPERIMENT_ID || !SENTINEL_TOKEN) return;
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
