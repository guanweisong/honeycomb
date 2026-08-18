import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MediaEntity } from "@/packages/trpc/api/outputs";

const { toastInfo, selectMediaRef } = vi.hoisted(() => ({
  toastInfo: vi.fn(),
  selectMediaRef: { current: undefined as ((media: MediaEntity) => void) | undefined },
}));

vi.mock("sonner", () => ({
  toast: { info: toastInfo },
}));

vi.mock("@/packages/ui/extended/Sheet", () => ({
  Sheet: (props: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div data-open={props.open}>
      <button type="button" onClick={props.onConfirm}>
        confirm
      </button>
      <button type="button" onClick={() => props.onOpenChange(false)}>
        cancel
      </button>
      {props.children}
    </div>
  ),
}));

vi.mock(
  "@/features/media/shared/MediaPageShell",
  () => ({
    MediaPageShell: (props: { onSelect: (media: MediaEntity) => void }) => {
      selectMediaRef.current = props.onSelect;
      return <div>media-page</div>;
    },
  }),
);

import PhotoPickerModal from ".";

describe("PhotoPickerModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    toastInfo.mockReset();
    selectMediaRef.current = undefined;
  });

  function render(handlePhotoPickerOk = vi.fn(), handlePhotoPickerCancel = vi.fn()) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <PhotoPickerModal
          pickerContent={(onSelect) => {
            selectMediaRef.current = onSelect;
            return <div>media-page</div>;
          }}
          showPhotoPicker
          handlePhotoPickerOk={handlePhotoPickerOk}
          handlePhotoPickerCancel={handlePhotoPickerCancel}
        />,
      ),
    );
    return { handlePhotoPickerOk, handlePhotoPickerCancel };
  }

  it("asks the user to select an image before confirming", () => {
    render();

    act(() =>
      container.querySelector<HTMLButtonElement>("button")?.click(),
    );

    expect(toastInfo).toHaveBeenCalledWith("请选择图片");
  });

  it("returns the selected media on confirmation", () => {
    const media = { id: "media-1", url: "https://example.test/image.jpg" } as MediaEntity;
    const { handlePhotoPickerOk } = render();

    act(() => selectMediaRef.current?.(media));
    act(() =>
      container.querySelector<HTMLButtonElement>("button")?.click(),
    );

    expect(handlePhotoPickerOk).toHaveBeenCalledWith(media);
  });

  it("forwards cancellation from the sheet", () => {
    const { handlePhotoPickerCancel } = render();

    act(() =>
      container.querySelectorAll<HTMLButtonElement>("button")[1]?.click(),
    );

    expect(handlePhotoPickerCancel).toHaveBeenCalledTimes(1);
  });
});
