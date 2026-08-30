const BASE_MS = 30_000; // 30s
const CAP_MS = 30 * 60_000; // 30min

// Exponential backoff with full jitter (attempts is the count AFTER the failed attempt, so the
// first retry is attempt=1 → ~15-30s later, not immediate).
export function nextAttemptDelayMs(attempts) {
  const exp = Math.min(BASE_MS * 2 ** (attempts - 1), CAP_MS);
  return Math.floor(exp / 2 + Math.random() * (exp / 2));
}
