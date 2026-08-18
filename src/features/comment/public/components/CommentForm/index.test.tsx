import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/packages/ui/components/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

import { CommentForm } from ".";

describe("CommentForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  function render(props: Partial<React.ComponentProps<typeof CommentForm>> = {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const formRef = { current: null } as React.RefObject<HTMLFormElement | null>;
    const onSubmit = vi.fn();
    act(() =>
      root.render(
        <CommentForm
          replyTo={null}
          formRef={formRef}
          isPending={false}
          onSubmit={onSubmit}
          onCancelReply={vi.fn()}
          onClearIdentity={vi.fn()}
          {...props}
        />,
      ),
    );
    return { formRef, onSubmit };
  }

  it("renders identity fields for a new commenter", () => {
    render();

    expect(container.querySelector('input[name="author"]')).not.toBeNull();
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
    expect(container.querySelector('input[name="site"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="content"]')).not.toBeNull();
  });

  it("renders welcome text and clears identity controls for a known commenter", () => {
    const onClearIdentity = vi.fn();
    render({ identity: { author: "Alice", email: "alice@example.test" }, onClearIdentity });

    expect(container.textContent).toContain("welcomeBack");
    expect(container.querySelector('input[name="author"]')).toBeNull();
    container.querySelector("a")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClearIdentity).toHaveBeenCalledTimes(1);
  });

  it("shows reply target, supports cancellation, and disables submit while pending", () => {
    const onCancelReply = vi.fn();
    render({
      replyTo: { id: "comment-1", author: "Bob" } as never,
      onCancelReply,
      isPending: true,
    });

    expect(container.textContent).toContain("Bob");
    container.querySelector("a")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
    ).toBe(true);
  });

  it("forwards form submission", () => {
    const { onSubmit } = render();

    act(() =>
      container.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
