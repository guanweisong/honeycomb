import React from "react";
import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

import { CommentForm } from ".";
import { CommentStatus } from "@/features/comment/types/comment.status";

describe("CommentForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  function render(
    props: Partial<React.ComponentProps<typeof CommentForm>> = {},
  ) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const formRef = {
      current: null,
    } as React.RefObject<HTMLFormElement | null>;
    const onSubmit = vi.fn();
    act(() =>
      root.render(
        <CommentForm
          replyTo={null}
          formRef={formRef}
          isPending={false}
          onSubmit={onSubmit}
          onDraftChange={vi.fn()}
          onCancelReply={vi.fn()}
          onClearIdentity={vi.fn()}
          {...props}
        />,
      ),
    );
    return { formRef, onSubmit };
  }

  it("blocks native submission before hydration and enables the client handler afterward", async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const form = (
      <CommentForm
        replyTo={null}
        formRef={{ current: null }}
        isPending={false}
        onSubmit={onSubmit}
        onDraftChange={vi.fn()}
        onCancelReply={vi.fn()}
        onClearIdentity={vi.fn()}
      />
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(form);
    container.querySelector<HTMLInputElement>('[name="author"]')!.value =
      "Alice";
    container.querySelector<HTMLInputElement>('[name="email"]')!.value =
      "alice@example.test";
    container.querySelector<HTMLTextAreaElement>('[name="content"]')!.value =
      "Hello";
    const button = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;
    // No React listeners exist in SSR HTML. A native submit here would navigate
    // rather than run captcha validation, even though the fields are visible.
    const nativeSubmit = vi.fn((event: Event) => event.preventDefault());
    container.querySelector("form")!.addEventListener("submit", nativeSubmit);
    button.click();
    expect(nativeSubmit).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
    container
      .querySelector("form")!
      .removeEventListener("submit", nativeSubmit);

    await act(async () => {
      root = hydrateRoot(container, form);
    });

    expect(button.disabled).toBe(false);
    act(() => button.click());
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[0].defaultPrevented).toBe(true);
  });

  it("renders identity fields for a new commenter", () => {
    render();

    expect(container.querySelector('input[name="author"]')).not.toBeNull();
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
    expect(container.querySelector('input[name="site"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="content"]')).not.toBeNull();
    for (const name of ["author", "email", "site", "content"]) {
      const input = container.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(`[name="${name}"]`);
      expect(input?.labels?.length).toBe(1);
      expect(input?.labels?.[0]?.textContent).toBeTruthy();
    }
  });

  it("renders welcome text and clears identity controls for a known commenter", () => {
    const onClearIdentity = vi.fn();
    render({
      identity: { author: "Alice", email: "alice@example.test" },
      onClearIdentity,
    });

    expect(container.textContent).toContain("welcomeBack");
    expect(container.querySelector('input[name="author"]')).toBeNull();
    container
      .querySelector('button[type="button"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClearIdentity).toHaveBeenCalledTimes(1);
  });

  it("shows reply target, supports cancellation, and disables submit while pending", () => {
    const onCancelReply = vi.fn();
    render({
      replyTo: {
        id: "comment-1",
        author: "Bob",
        content: "",
        site: null,
        parentId: null,
        status: CommentStatus.PUBLISH,
        createdAt: null,
        avatar: "",
      },
      onCancelReply,
      isPending: true,
    });

    expect(container.textContent).toContain("Bob");
    container
      .querySelector('button[type="button"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.disabled,
    ).toBe(true);
  });

  it("forwards form submission", () => {
    const { onSubmit } = render();

    act(() =>
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
