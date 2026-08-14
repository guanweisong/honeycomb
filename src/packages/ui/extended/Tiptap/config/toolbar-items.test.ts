import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { Editor } from "@tiptap/core";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../components/ToolbarLinkItem", () => ({
  ToolbarLinkItem: () => React.createElement("span", null, "link-control"),
}));

vi.mock("../components/ToolbarImageItem", () => ({
  ToolbarImageItem: () => React.createElement("span", null, "image-control"),
}));

vi.mock("../components/ToolbarVideoItem", () => ({
  ToolbarVideoItem: () => React.createElement("span", null, "video-control"),
}));

import {
  toolbarItems,
  type ToolbarItem,
  type ToolbarItemOrGroup,
} from "./toolbar-items";

type RecordedCall = {
  args: unknown[];
  method: string;
};

const actionableItems = toolbarItems
  .flat()
  .flatMap((item: ToolbarItemOrGroup) =>
    "items" in item ? item.items : [item],
  );

function getItem(label: string): ToolbarItem {
  const item = actionableItems.find((candidate) => candidate.label === label);
  if (!item) throw new Error(`Missing toolbar item: ${label}`);
  return item;
}

function createEditor(active = true) {
  const calls: RecordedCall[] = [];
  const chain: Record<string, (...args: unknown[]) => unknown> = new Proxy(
    {},
    {
      get: (_target, property) => (...args: unknown[]) => {
        calls.push({ method: String(property), args });
        return chain;
      },
    },
  );

  const editor = {
    chain: () => {
      calls.push({ method: "chain", args: [] });
      return chain;
    },
    isActive: (...args: unknown[]) => {
      calls.push({ method: "isActive", args });
      return active;
    },
  } as unknown as Editor;

  return { calls, editor };
}

describe("toolbar-items", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each([
    ["一级标题", ["heading", { level: 1 }], "toggleHeading", [{ level: 1 }]],
    ["二级标题", ["heading", { level: 2 }], "toggleHeading", [{ level: 2 }]],
    ["三级标题", ["heading", { level: 3 }], "toggleHeading", [{ level: 3 }]],
    ["无序列表", ["bulletList"], "toggleBulletList", []],
    ["有序列表", ["orderedList"], "toggleOrderedList", []],
    ["任务列表", ["taskList"], "toggleTaskList", []],
    ["块级引用", ["blockquote"], "toggleBlockquote", []],
    ["块级代码", ["codeBlock"], "toggleCodeBlock", []],
    ["加粗", ["bold"], "toggleBold", []],
    ["斜体", ["italic"], "toggleItalic", []],
    ["中划线", ["strike"], "toggleStrike", []],
    ["下划线", ["underline"], "toggleUnderline", []],
    ["代码", ["code"], "toggleCode", []],
    ["高亮", ["highlight"], "toggleHighlight", []],
    ["左对齐", [{ textAlign: "left" }], "setTextAlign", ["left"]],
    ["居中对齐", [{ textAlign: "center" }], "setTextAlign", ["center"]],
    ["右对齐", [{ textAlign: "right" }], "setTextAlign", ["right"]],
    ["两端对齐", [{ textAlign: "justify" }], "setTextAlign", ["justify"]],
  ] as const)(
    "%s checks the matching active state and editor command",
    (label, activeArgs, command, commandArgs) => {
      const item = getItem(label);
      const { calls, editor } = createEditor(true);

      expect(item.isActive?.(editor)).toBe(true);
      expect(calls).toEqual([{ method: "isActive", args: [...activeArgs] }]);

      calls.length = 0;
      item.onClick?.(editor);
      expect(calls).toEqual([
        { method: "chain", args: [] },
        { method: "focus", args: [] },
        { method: command, args: [...commandArgs] },
        { method: "run", args: [] },
      ]);
    },
  );

  it.each([
    ["红", "red"],
    ["橙", "orange"],
    ["黄", "yellow"],
    ["绿", "green"],
    ["青", "teal"],
    ["蓝", "blue"],
    ["紫", "purple"],
  ] as const)("%s toggles its literal text color", (label, color) => {
    const item = getItem(label);
    const inactive = createEditor(false);

    expect(item.isActive?.(inactive.editor)).toBe(false);
    expect(inactive.calls).toEqual([
      { method: "isActive", args: ["textStyle", { color }] },
    ]);

    inactive.calls.length = 0;
    item.onClick?.(inactive.editor);
    expect(inactive.calls).toEqual([
      { method: "isActive", args: ["textStyle", { color }] },
      { method: "chain", args: [] },
      { method: "focus", args: [] },
      { method: "setColor", args: [color] },
      { method: "run", args: [] },
    ]);

    const active = createEditor(true);
    item.onClick?.(active.editor);
    expect(active.calls).toEqual([
      { method: "isActive", args: ["textStyle", { color }] },
      { method: "chain", args: [] },
      { method: "focus", args: [] },
      { method: "unsetColor", args: [] },
      { method: "run", args: [] },
    ]);
  });

  it.each([
    ["撤销", "undo"],
    ["重做", "redo"],
  ] as const)("%s invokes the matching history command", (label, command) => {
    const item = getItem(label);
    const { calls, editor } = createEditor();

    item.onClick?.(editor);

    expect(calls).toEqual([
      { method: "chain", args: [] },
      { method: "focus", args: [] },
      { method: command, args: [] },
      { method: "run", args: [] },
    ]);
  });

  it.each([
    ["超链接", "link-control"],
    ["上传图片", "image-control"],
    ["上传视频", "video-control"],
  ] as const)("%s renders its interactive control", async (label, text) => {
    const item = getItem(label);
    const { editor } = createEditor();

    await act(async () => {
      root.render(item.render?.(editor));
    });

    expect(container.textContent).toBe(text);
  });
});
