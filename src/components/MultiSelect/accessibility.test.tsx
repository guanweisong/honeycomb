import { act } from "react";
import { createRoot } from "react-dom/client";
import { waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { MultiSelect } from "@/components/MultiSelect/index";
it("names real filter checkboxes, disables unavailable values, and toggles once per click", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const scroll = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = () => {};
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onChange = vi.fn();
  try {
    await act(async () =>
      root.render(
        <MultiSelect
          trigger={<button>筛选</button>}
          value={["one"]}
          onChange={onChange}
          options={[
            { label: "一", value: "one" },
            { label: "二", value: "two" },
            { label: "禁用", value: "disabled", disabled: true },
          ]}
        />,
      ),
    );
    await act(async () => container.querySelector("button")?.click());
    const checkbox = document.body.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="二"]',
    );
    expect(checkbox).not.toBeNull();
    await act(async () => checkbox?.click());
    expect(onChange.mock.calls).toEqual([[["one", "two"]]]);
    const disabled = document.body.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="禁用"]',
    );
    expect(disabled?.disabled).toBe(true);
    await act(async () => disabled?.click());
    expect(onChange).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    Element.prototype.scrollIntoView = scroll;
    vi.unstubAllGlobals();
  }
});

it("preserves externally controlled openness and returns keyboard dismissal to the owner", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const scroll = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = () => {};
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onOpenChange = vi.fn();
  const render = (open: boolean) =>
    root.render(
      <MultiSelect
        open={open}
        onOpenChange={onOpenChange}
        trigger={<button>筛选</button>}
        options={[{ label: "一", value: "one" }]}
      />,
    );
  try {
    await act(async () => render(false));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => container.querySelector("button")?.click());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    // The controlled owner, not the component, decides when to show it.
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => render(true));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await act(async () => render(false));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(container.querySelector("button")),
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
    Element.prototype.scrollIntoView = scroll;
    vi.unstubAllGlobals();
  }
});
