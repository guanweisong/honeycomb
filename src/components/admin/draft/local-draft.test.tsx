import React, { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useLocalDraft } from "./use-local-draft";
import { LocalDraftPrompt } from "./LocalDraftPrompt";

type Values = { title: { zh: string; en: string }; content: string };
const initial: Values = { title: { zh: "标题", en: "Title" }, content: "" };
const changed: Values = { ...initial, content: "unsaved" };
const parse = (value: unknown): Values | null => {
  const v = value as Values;
  return v &&
    typeof v.content === "string" &&
    typeof v.title?.zh === "string" &&
    typeof v.title?.en === "string"
    ? v
    : null;
};
const record = (values = changed, savedAt = Date.now()) =>
  JSON.stringify({ version: 1, savedAt, values });
let root: Root;
let container: HTMLDivElement;
let result: ReturnType<typeof useLocalDraft<Values>>;
let props: Parameters<typeof useLocalDraft<Values>>[0];
function Harness() {
  const draft = useLocalDraft(props);
  useLayoutEffect(() => {
    result = draft;
  });
  return <LocalDraftPrompt {...draft} />;
}
function render(next: Partial<typeof props> = {}) {
  props = { ...props, ...next };
  act(() => root.render(<Harness />));
}
function advance() {
  act(() => vi.advanceTimersByTime(500));
}
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  props = {
    storageKey: "user:post:1",
    values: initial,
    dirty: false,
    ready: true,
    parse,
    onRestore: vi.fn(),
  };
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("does not save pristine hydration; debounces changed bilingual drafts", () => {
  render({ ready: false, dirty: true });
  advance();
  expect(localStorage.length).toBe(0);
  render({ ready: true, dirty: false });
  advance();
  expect(localStorage.length).toBe(0);
  render({ values: changed, dirty: true });
  expect(localStorage.length).toBe(0);
  advance();
  expect(JSON.parse(localStorage.getItem(props.storageKey!)!).values).toEqual(
    changed,
  );
  const old = localStorage.getItem(props.storageKey!);
  vi.advanceTimersByTime(1000);
  render({ values: { ...changed } });
  advance();
  expect(localStorage.getItem(props.storageKey!)).toBe(old);
});
it("preserves a pending backup until explicit restore and shows local-only prompt", () => {
  const raw = record();
  localStorage.setItem(props.storageKey!, raw);
  render();
  expect(result.pending?.values).toEqual(changed);
  expect(props.onRestore).not.toHaveBeenCalled();
  expect(container.textContent).toContain("当前浏览器");
  render({ dirty: true, values: { ...changed, content: "typing" } });
  advance();
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(localStorage.getItem(props.storageKey!)).toBe(raw);
  act(() => result.restore());
  expect(props.onRestore).toHaveBeenCalledWith(changed);
  expect(result.pending).toBeNull();
});
it("discards only the selected backup and does not immediately recreate it", () => {
  localStorage.setItem(props.storageKey!, record());
  render();
  act(() => result.discard());
  advance();
  expect(localStorage.getItem(props.storageKey!)).toBeNull();
  expect(props.onRestore).not.toHaveBeenCalled();
});
it.each([
  "{",
  record(initial, Date.now() - 31 * 86400000),
  JSON.stringify({ version: 2, savedAt: Date.now(), values: changed }),
  JSON.stringify({ version: 1, savedAt: Date.now(), values: {} }),
  "x".repeat(1048577),
])(
  "ignores invalid, expired, wrong-version, malformed or oversized backup",
  (raw) => {
    localStorage.setItem(props.storageKey!, raw);
    render();
    expect(result.pending).toBeNull();
  },
);
it("isolates keys and never saves old values into a new scope while loading", () => {
  render();
  render({ dirty: true, values: changed });
  render({ storageKey: "user:page:2", ready: false });
  advance();
  expect(JSON.parse(localStorage.getItem("user:post:1")!).values).toEqual(
    changed,
  );
  expect(localStorage.getItem("user:page:2")).toBeNull();
  render({ ready: true, dirty: false, values: initial });
  advance();
  expect(result.pending).toBeNull();
});
it("flushes latest edits on pagehide and unmount", () => {
  render({ values: changed, dirty: true });
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(JSON.parse(localStorage.getItem(props.storageKey!)!).values).toEqual(
    changed,
  );
  render({ values: { ...changed, content: "latest" } });
  act(() => root.unmount());
  root = createRoot(container);
  expect(
    JSON.parse(localStorage.getItem(props.storageKey!)!).values.content,
  ).toBe("latest");
});
it("clears only submitted values and keeps edits made during an async save", () => {
  render({ values: changed, dirty: true });
  advance();
  const later = { ...changed, content: "later" };
  render({ values: later });
  act(() => result.clearSaved(changed));
  advance();
  expect(JSON.parse(localStorage.getItem(props.storageKey!)!).values).toEqual(
    later,
  );
  act(() => result.clearSaved(later));
  advance();
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(localStorage.getItem(props.storageKey!)).toBeNull();
});
it("never deletes a backup replaced by another tab", () => {
  localStorage.setItem(props.storageKey!, record());
  render();
  const other = record({ ...changed, content: "other tab" });
  localStorage.setItem(props.storageKey!, other);
  act(() => result.discard());
  expect(localStorage.getItem(props.storageKey!)).toBe(other);
  render({ dirty: true, values: changed });
  advance();
  localStorage.setItem(props.storageKey!, other);
  act(() => result.clearSaved(changed));
  expect(localStorage.getItem(props.storageKey!)).toBe(other);
});
it.each(["getItem", "setItem", "removeItem"] as const)(
  "contains storage %s failures",
  (method) => {
    if (method === "removeItem")
      localStorage.setItem(props.storageKey!, record());
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    expect(() => {
      render({ dirty: true, values: changed });
      advance();
      act(() => result.discard());
      act(() => result.clearSaved(changed));
    }).not.toThrow();
  },
);
it("does not persist drafts exceeding the size cap", () => {
  render({
    values: { ...changed, content: "中".repeat(1048576) },
    dirty: true,
  });
  advance();
  expect(localStorage.length).toBe(0);
});

it("does not clear a newer own backup when an older submission finishes", () => {
  render({ values: changed, dirty: true });
  advance();
  const later = { ...changed, content: "already backed up" };
  render({ values: later });
  advance();
  const raw = localStorage.getItem(props.storageKey!);
  act(() => result.clearSaved(changed));
  expect(localStorage.getItem(props.storageKey!)).toBe(raw);
});

it("keeps an existing backup intact throughout hydration", () => {
  const raw = record();
  localStorage.setItem(props.storageKey!, raw);
  render({ ready: false, dirty: true });
  advance();
  expect(result.pending).toBeNull();
  expect(localStorage.getItem(props.storageKey!)).toBe(raw);
  render({ ready: true, dirty: false });
  expect(result.pending?.values).toEqual(changed);
});

it("does not let an old save callback clear the newly selected entity", () => {
  render({ values: changed, dirty: true });
  advance();
  const clearPrevious = result.clearSaved;
  render({ storageKey: "other", values: changed, dirty: true });
  advance();
  const raw = localStorage.getItem("other");
  act(() => clearPrevious(changed));
  expect(localStorage.getItem("other")).toBe(raw);
});

it("retains an older backup when a later write exceeds storage quota", () => {
  render({ values: changed, dirty: true });
  advance();
  const raw = localStorage.getItem(props.storageKey!);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  render({ values: { ...changed, content: "newer" } });
  advance();
  expect(localStorage.getItem(props.storageKey!)).toBe(raw);
});

it("clears an older own backup when current values save before the debounce", () => {
  render({ values: changed, dirty: true });
  advance();
  const submitted = { ...changed, content: "saved before backup" };
  render({ values: submitted });
  act(() => result.clearSaved(submitted));
  advance();
  expect(localStorage.getItem(props.storageKey!)).toBeNull();
});

it("does not discard an unresolved recovery choice when the current baseline saves", () => {
  const raw = record();
  localStorage.setItem(props.storageKey!, raw);
  render();
  act(() => result.clearSaved(initial));
  expect(result.pending?.values).toEqual(changed);
  expect(localStorage.getItem(props.storageKey!)).toBe(raw);
});

it("backs up new edits after discarding an older pending recovery", () => {
  localStorage.setItem(props.storageKey!, record());
  render();
  const fresh = { ...initial, content: "new work instead" };
  render({ values: fresh, dirty: true });
  act(() => result.discard());
  advance();
  expect(JSON.parse(localStorage.getItem(props.storageKey!)!).values).toEqual(
    fresh,
  );
});
