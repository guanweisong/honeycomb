import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PostEditorActions } from "@/app/admin/(dashboard)/post/edit/components/PostEditorActions/index";

vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCan: () => true,
}));

it("waits for withdrawal and keeps its dialog open on failure until a successful retry", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let finish: ((saved: boolean) => void) | undefined;
  const submit = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );

  try {
    await act(async () =>
      root.render(
        <PostEditorActions
          id="post-1"
          status="PUBLISHED"
          loading={false}
          submit={submit}
        />,
      ),
    );
    await act(async () => {
      requireDefined(
        Array.from(container.querySelectorAll("button")).find(
          (button) => button.textContent === "撤回为草稿",
        ),
      ).click();
    });
    const confirmButton = () =>
      requireDefined(
        document.querySelector<HTMLButtonElement>(
          '[role="dialog"] button[data-slot="button"]',
        ),
      );
    await act(async () => confirmButton().click());
    expect(submit).toHaveBeenCalledWith("DRAFT", "update");
    expect(confirmButton().disabled).toBe(true);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    await act(async () => requireDefined(finish)(false));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(confirmButton().disabled).toBe(false);

    await act(async () => confirmButton().click());
    await act(async () => requireDefined(finish)(true));
    expect(submit).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
