import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../components/ToolbarLinkItem", () => ({
  ToolbarLinkItem: () => React.createElement("span", null, "link-control"),
}));

vi.mock("../components/ToolbarImageItem", () => ({
  ToolbarImageItem: () => React.createElement("span", null, "image-control"),
}));

import {
  toolbarItems,
  type ToolbarItem,
  type ToolbarItemOrGroup,
} from "./toolbar-items";

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

describe("toolbar-items", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        TaskList,
        TaskItem,
        Highlight,
        TextStyle,
        Color,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ],
      content: "<p>Text</p>",
    });
    editor.commands.setTextSelection({ from: 1, to: 5 });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    container.remove();
  });

  it("does not offer unsupported video insertion", () => {
    expect(actionableItems.some((item) => item.label === "上传视频")).toBe(
      false,
    );
  });

  it.each([
    ["一级标题", ["heading", { level: 1 }]],
    ["二级标题", ["heading", { level: 2 }]],
    ["三级标题", ["heading", { level: 3 }]],
    ["无序列表", ["bulletList"]],
    ["有序列表", ["orderedList"]],
    ["任务列表", ["taskList"]],
    ["块级引用", ["blockquote"]],
    ["块级代码", ["codeBlock"]],
    ["加粗", ["bold"]],
    ["斜体", ["italic"]],
    ["中划线", ["strike"]],
    ["下划线", ["underline"]],
    ["代码", ["code"]],
    ["高亮", ["highlight"]],
    ["左对齐", [{ textAlign: "left" }]],
    ["居中对齐", [{ textAlign: "center" }]],
    ["右对齐", [{ textAlign: "right" }]],
    ["两端对齐", [{ textAlign: "justify" }]],
  ] as const)(
    "%s checks the matching active state and editor command",
    (label, activeArgs) => {
      const item = getItem(label);
      item.onClick?.(editor);
      expect(item.isActive?.(editor)).toBe(true);
      const [name, attributes] = activeArgs;
      expect(
        typeof name === "string"
          ? editor.isActive(name, attributes)
          : editor.isActive(name),
      ).toBe(true);
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
    expect(item.isActive?.(editor)).toBe(false);
    item.onClick?.(editor);
    expect(editor.getAttributes("textStyle").color).toBe(color);
    expect(item.isActive?.(editor)).toBe(true);
    item.onClick?.(editor);
    expect(editor.getAttributes("textStyle").color).toBeUndefined();
  });

  it("undoes and redoes an actual edit", () => {
    editor.commands.insertContent("Changed");
    getItem("撤销").onClick?.(editor);
    expect(editor.getText()).toBe("Text");
    getItem("重做").onClick?.(editor);
    expect(editor.getText()).toBe("Changed");
  });

  it.each([
    ["超链接", "link-control"],
    ["上传图片", "image-control"],
  ] as const)("%s renders its interactive control", async (label, text) => {
    const item = getItem(label);

    await act(async () => {
      root.render(item.render?.(editor));
    });

    expect(container.textContent).toBe(text);
  });
});
