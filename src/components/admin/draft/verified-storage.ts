/** Browser recovery reads are best-effort and remain schema-validated by each feature. */
export function readStoredJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Durable pre-send receipts require a synchronous, exact write/readback. */
export function writeVerifiedJson(key: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value);
    if (typeof raw !== "string") return false;
    window.localStorage.setItem(key, raw);
    return window.localStorage.getItem(key) === raw;
  } catch {
    return false;
  }
}
