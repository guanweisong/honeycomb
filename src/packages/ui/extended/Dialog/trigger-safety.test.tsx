import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Dialog } from ".";

it("preserves the trigger click handler while opening the dialog", async () => {
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  const click = vi.fn();
  try {
    await act(async () =>
      root.render(
        <Dialog
          trigger={<button onClick={click}>Open</button>}
          title="Dialog"
          description="Details"
        />,
      ),
    );
    await act(async () => element.querySelector("button")?.click());
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
    element.remove();
  }
});
