"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Draft<T> = { savedAt: number; values: T };
type Options<T> = {
  storageKey: string | null;
  values: T;
  dirty: boolean;
  ready: boolean;
  parse: (value: unknown) => T | null;
  onRestore: (values: T) => void;
};
type Session<T> = {
  key: string;
  pending: Draft<T> | null;
  raw: string | null;
  json: string | null;
  dirty: boolean;
  suppressed: string | null;
  timer?: ReturnType<typeof setTimeout>;
};
const MAX_BYTES = 1024 * 1024;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
function serialize(value: unknown): string | null {
  try {
    const json = JSON.stringify(value);
    return typeof json === "string" &&
      new TextEncoder().encode(json).length <= MAX_BYTES
      ? json
      : null;
  } catch {
    return null;
  }
}
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function removeMatching(key: string, raw: string | null) {
  try {
    if (raw !== null && window.localStorage.getItem(key) === raw)
      window.localStorage.removeItem(key);
  } catch {
    /* Storage can be disabled or full. */
  }
}
function load<T>(
  raw: string | null,
  parse: Options<T>["parse"],
): Draft<T> | null {
  try {
    if (!raw || new TextEncoder().encode(raw).length > MAX_BYTES) return null;
    const decoded: unknown = JSON.parse(raw);
    if (typeof decoded !== "object" || decoded === null) return null;
    const entry = decoded as Record<string, unknown>;
    if (
      entry.version !== 1 ||
      typeof entry.savedAt !== "number" ||
      !Number.isFinite(entry.savedAt) ||
      entry.savedAt > Date.now() ||
      Date.now() - entry.savedAt > MAX_AGE
    )
      return null;
    const values = parse(entry.values);
    return values === null ? null : { savedAt: entry.savedAt, values };
  } catch {
    return null;
  }
}
function flush<T>(session: Session<T>) {
  clearTimeout(session.timer);
  if (
    session.pending ||
    !session.dirty ||
    session.json === null ||
    session.json === session.suppressed
  )
    return;
  const raw = serialize({
    version: 1,
    savedAt: Date.now(),
    values: JSON.parse(session.json) as unknown,
  });
  if (!raw) return;
  try {
    // Local editing is last-writer-wins, but destructive clearing compares the exact record.
    window.localStorage.setItem(session.key, raw);
    session.raw = raw;
    session.suppressed = session.json;
  } catch {
    /* Never interrupt editing when browser storage is unavailable. */
  }
}

/** Browser-only recovery, not a server draft or a cross-tab collaboration system. */
export function useLocalDraft<T>({
  storageKey,
  values,
  dirty,
  ready,
  parse,
  onRestore,
}: Options<T>) {
  const session = useRef<Session<T> | null>(null);
  const [pendingState, setPendingState] = useState<{
    key: string;
    draft: Draft<T>;
  } | null>(null);
  const json = serialize(values);
  useEffect(() => {
    if (session.current?.key !== storageKey) {
      if (session.current) flush(session.current);
      session.current = null;
      setPendingState(null);
    }
    if (!storageKey || !ready) {
      if (session.current) {
        clearTimeout(session.current.timer);
        session.current.dirty = false;
      }
      return;
    }
    if (!session.current) {
      const raw = read(storageKey);
      const pending = load(raw, parse);
      session.current = {
        key: storageKey,
        pending,
        raw,
        json,
        dirty,
        suppressed: null,
      };
      setPendingState(pending ? { key: storageKey, draft: pending } : null);
    }
    const current = session.current;
    current.json = json;
    current.dirty = dirty;
    clearTimeout(current.timer);
    if (
      !current.pending &&
      dirty &&
      json !== null &&
      json !== current.suppressed
    )
      current.timer = setTimeout(() => flush(current), 500);
  }, [storageKey, ready, json, dirty, parse]);
  useEffect(() => {
    const flushCurrent = () => {
      if (session.current) flush(session.current);
    };
    window.addEventListener("pagehide", flushCurrent);
    return () => {
      window.removeEventListener("pagehide", flushCurrent);
      flushCurrent();
    };
  }, []);
  const restore = useCallback(() => {
    const current = session.current;
    if (!current || current.key !== storageKey || !current.pending) return;
    const recovered = current.pending.values;
    current.pending = null;
    current.suppressed = current.json;
    setPendingState(null);
    onRestore(recovered);
  }, [storageKey, onRestore]);
  const discard = useCallback(() => {
    const current = session.current;
    if (!current || current.key !== storageKey || !current.pending) return;
    removeMatching(current.key, current.raw);
    current.raw = null;
    current.pending = null;
    current.suppressed = current.dirty ? null : current.json;
    if (current.dirty) current.timer = setTimeout(() => flush(current), 500);
    setPendingState(null);
  }, [storageKey]);
  const clearSaved = useCallback(
    (submitted: T) => {
      const current = session.current;
      if (!current || current.key !== storageKey) return;
      const submittedJson = serialize(submitted);
      if (submittedJson === null) return;
      const saved = load(current.raw, parse);
      if (
        !current.pending &&
        saved &&
        (serialize(saved.values) === submittedJson ||
          current.json === submittedJson)
      ) {
        removeMatching(current.key, current.raw);
        current.raw = null;
        current.pending = null;
        setPendingState(null);
      }
      if (current.json === submittedJson) {
        clearTimeout(current.timer);
        current.suppressed = submittedJson;
      }
    },
    [storageKey, parse],
  );
  return {
    pending:
      ready && pendingState?.key === storageKey ? pendingState.draft : null,
    restore,
    discard,
    clearSaved,
  };
}
