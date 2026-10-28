import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaRecordSchema } from "@/features/media/schemas/media.record.schema";
import type { MediaRecord as MediaEntity } from "@/features/media/types/media.record";

const { toastInfo, selectMediaRef, confirmRef } = vi.hoisted(() => ({
  toastInfo: vi.fn(),
  confirmRef: { current: undefined as (() => void) | undefined },
  selectMediaRef: {
    current: undefined as
      ((media: MediaEntity | undefined) => void) | undefined,
  },
}));

vi.mock("sonner", () => ({
  toast: { info: toastInfo },
}));

vi.mock("@/components/Sheet", () => ({
  Sheet: (props: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => {
    confirmRef.current = props.onConfirm;
    return (
      <div data-open={props.open}>
        <button type="button" onClick={props.onConfirm}>
          confirm
        </button>
        <button type="button" onClick={() => props.onOpenChange(false)}>
          cancel
        </button>
        {props.children}
      </div>
    );
  },
}));

import PhotoPickerModal from "@/features/media/admin/components/PhotoPicker";

const mediaFixture = {
  id: "media-1",
  url: "https://example.test/image.jpg",
  key: "image.jpg",
  name: "image.jpg",
  type: "image/jpeg",
  size: 1,
  color: null,
  width: null,
  height: null,
  createdAt: null,
  updatedAt: null,
} satisfies MediaEntity;

describe("PhotoPickerModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    toastInfo.mockReset();
    selectMediaRef.current = undefined;
    confirmRef.current = undefined;
  });

  function render(
    handlePhotoPickerOk = vi.fn(),
    handlePhotoPickerCancel = vi.fn(),
  ) {
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

    act(() => container.querySelector<HTMLButtonElement>("button")?.click());

    expect(toastInfo).toHaveBeenCalledWith("请选择图片");
  });

  it("returns the selected media on confirmation", () => {
    const media = mediaFixture;
    const { handlePhotoPickerOk } = render();

    act(() => selectMediaRef.current?.(media));
    act(() => container.querySelector<HTMLButtonElement>("button")?.click());

    expect(handlePhotoPickerOk).toHaveBeenCalledWith(media);
  });

  it("does not reuse a previous selection when the mounted picker is reopened", () => {
    const confirm = vi.fn();
    render(confirm);
    const media = mediaFixture;
    act(() => selectMediaRef.current?.(media));
    const picker = (open: boolean) => (
      <PhotoPickerModal
        showPhotoPicker={open}
        handlePhotoPickerOk={confirm}
        handlePhotoPickerCancel={vi.fn()}
        pickerContent={(onSelect) => {
          selectMediaRef.current = onSelect;
          return null;
        }}
      />
    );
    act(() => root.render(picker(false)));
    act(() => root.render(picker(true)));
    act(() => container.querySelector<HTMLButtonElement>("button")?.click());
    expect(confirm).not.toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalledWith("请选择图片");
  });

  it("confirms a selection at most once per open picker", () => {
    const { handlePhotoPickerOk } = render();
    act(() => selectMediaRef.current?.(mediaFixture));
    act(() => {
      container.querySelector<HTMLButtonElement>("button")?.click();
      container.querySelector<HTMLButtonElement>("button")?.click();
    });
    expect(handlePhotoPickerOk).toHaveBeenCalledTimes(1);
    expect(
      MediaRecordSchema.safeParse(handlePhotoPickerOk.mock.calls[0]?.[0])
        .success,
    ).toBe(true);
  });
  it("ignores a late selection callback from a closed picker", () => {
    const confirm = vi.fn();
    render(confirm);
    const staleSelect = selectMediaRef.current;
    const picker = (open: boolean) => (
      <PhotoPickerModal
        showPhotoPicker={open}
        handlePhotoPickerOk={confirm}
        handlePhotoPickerCancel={vi.fn()}
        pickerContent={(onSelect) => {
          selectMediaRef.current = onSelect;
          return null;
        }}
      />
    );
    act(() => root.render(picker(false)));
    act(() => root.render(picker(true)));
    act(() => staleSelect?.(mediaFixture));
    act(() => container.querySelector<HTMLButtonElement>("button")?.click());
    expect(confirm).not.toHaveBeenCalled();
  });
  it("ignores a retained confirmation callback after its session closes", () => {
    const confirm = vi.fn();
    render(confirm);
    act(() => selectMediaRef.current?.(mediaFixture));
    const staleConfirm = confirmRef.current;
    act(() =>
      root.render(
        <PhotoPickerModal
          showPhotoPicker={false}
          handlePhotoPickerOk={confirm}
          handlePhotoPickerCancel={vi.fn()}
          pickerContent={() => null}
        />,
      ),
    );
    act(() => staleConfirm?.());
    expect(confirm).not.toHaveBeenCalled();
  });

  it("forwards cancellation from the sheet", () => {
    const { handlePhotoPickerCancel } = render();

    act(() =>
      container.querySelectorAll<HTMLButtonElement>("button")[1]?.click(),
    );

    expect(handlePhotoPickerCancel).toHaveBeenCalledTimes(1);
  });
});
