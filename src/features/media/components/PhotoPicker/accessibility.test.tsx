import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import PhotoPicker from "./index";
it("uses a viewport-bounded real sheet with reachable selection and cancel controls", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const cancel = vi.fn();
  try {
    await act(async () =>
      root.render(
        <PhotoPicker
          showPhotoPicker
          handlePhotoPickerOk={vi.fn()}
          handlePhotoPickerCancel={cancel}
          pickerContent={() => <button>选择媒体</button>}
        />,
      ),
    );
    const panel = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(panel?.className).toContain("w-full");
    expect(panel?.className).toContain("sm:max-w-[1000px]");
    expect(panel?.className).not.toContain("min-w-[1000px]");
    const select = [...document.body.querySelectorAll("button")].find(
      (button) => button.textContent === "选择媒体",
    );
    await act(async () => select?.focus());
    expect(document.activeElement).toBe(select);
    await act(async () =>
      [...document.body.querySelectorAll("button")]
        .find((button) => button.textContent === "取消")
        ?.click(),
    );
    expect(cancel).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
