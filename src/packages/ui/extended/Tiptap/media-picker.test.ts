import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/components/PhotoPicker", () => ({ default: () => null }));

import {
  TiptapMediaPickerProvider,
  type MediaPickerRenderer,
} from "./media-picker";
import { ToolbarImageItem } from "./components/ToolbarImageItem";
import { ToolbarVideoItem } from "./components/ToolbarVideoItem";

describe("Tiptap media picker", () => {
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
    ["image", ToolbarImageItem, "setImage"],
    ["video", ToolbarVideoItem, "setVideo"],
  ] as const)(
    "injects the %s picker without an App import",
    async (kind, Component, command) => {
      const run = vi.fn();
      const commandMethod = vi.fn(() => ({ run }));
      const focus = vi.fn(() => ({ [command]: commandMethod }));
      const editor = { chain: () => ({ focus }) };
      const renderer: MediaPickerRenderer = ({ open, onConfirm }) =>
        open
          ? React.createElement(
              "button",
              {
                "data-testid": "confirm-media",
                onClick: () => onConfirm({ url: "https://cdn.test/media" }),
              },
              "confirm",
            )
          : null;

      await act(async () =>
        root.render(
          React.createElement(
            TiptapMediaPickerProvider,
            { renderer },
            React.createElement(Component, { editor: editor as never }),
          ),
        ),
      );
      await act(async () => container.querySelector("button")?.click());
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[data-testid="confirm-media"]')
          ?.click(),
      );

      expect(commandMethod).toHaveBeenCalledWith({
        src: "https://cdn.test/media",
      });
      expect(run).toHaveBeenCalledOnce();
    },
  );
});
