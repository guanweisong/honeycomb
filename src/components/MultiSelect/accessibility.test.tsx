import { act } from "react";
import { createRoot } from "react-dom/client";
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
