import React, { act, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";
import { requireDefined } from "@tests/helpers/require-defined";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  error: vi.fn(),
  logger: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success, warning: mocks.warning },
}));
vi.mock("@/lib/observability/client", () => ({
  clientLogger: { error: mocks.logger },
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    page: {
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));

import { usePageEditorActions } from "../page-editor-actions";

const values = {
  title: { en: "About", zh: "关于" },
  content: { en: "English", zh: "中文" },
  template: PageTemplate.DEFAULT,
};
let editorActions: ReturnType<typeof usePageEditorActions> | undefined;

function Harness({ pageId }: { pageId?: string }) {
  const actions = usePageEditorActions({
    pageId,
    expectedVersion: 1,
    refetch: mocks.refetch,
  });
  useEffect(() => {
    editorActions = actions;
  }, [actions]);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("output", null, actions.loading ? "loading" : "idle"),
    React.createElement(
      "button",
      { onClick: () => void actions.submit(values, PageStatus.PUBLISHED) },
      "submit",
    ),
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("use-page-editor-actions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    editorActions = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("returns the saved revision without navigating and reports refresh failure separately", async () => {
    mocks.update.mockResolvedValue({
      id: "123456789012345678901234",
      version: 2,
    });
    mocks.refetch.mockResolvedValue({ isSuccess: false });
    await act(async () =>
      root.render(
        React.createElement(Harness, { pageId: "123456789012345678901234" }),
      ),
    );
    await act(async () => {
      await expect(
        requireDefined(editorActions).submit(values, PageStatus.PUBLISHED),
      ).resolves.toMatchObject({
        state: "updated",
        version: 2,
        refreshFailed: true,
      });
    });
    expect(mocks.warning).toHaveBeenCalledWith(
      "已保存，列表待刷新，请勿重复提交",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("does not refresh or toast after a different record is selected", async () => {
    const pending = deferred<{ id: string; version: number }>();
    mocks.update.mockReturnValue(pending.promise);
    await act(async () =>
      root.render(
        React.createElement(Harness, { pageId: "123456789012345678901234" }),
      ),
    );
    await act(async () => container.querySelector("button")?.click());
    await act(async () =>
      root.render(
        React.createElement(Harness, { pageId: "223456789012345678901234" }),
      ),
    );
    await act(async () =>
      pending.resolve({ id: "123456789012345678901234", version: 2 }),
    );
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.warning).not.toHaveBeenCalled();
  });
  it("keeps StrictMode saves usable and invalidates an A → B → A request", async () => {
    const first = deferred<{ id: string; version: number }>();
    const second = deferred<{ id: string; version: number }>();
    const pageA = "123456789012345678901234";
    const render = (pageId: string) =>
      act(async () =>
        root.render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(Harness, { pageId }),
          ),
        ),
      );
    mocks.update
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    mocks.refetch.mockResolvedValue({ isSuccess: true });
    await render(pageA);
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("output")?.textContent).toBe("loading");
    await render("223456789012345678901234");
    await render(pageA);
    expect(container.querySelector("output")?.textContent).toBe("idle");
    await act(async () => container.querySelector("button")?.click());
    await act(async () => first.resolve({ id: pageA, version: 2 }));
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(container.querySelector("output")?.textContent).toBe("loading");
    await act(async () => second.resolve({ id: pageA, version: 3 }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledTimes(1);
    expect(container.querySelector("output")?.textContent).toBe("idle");
  });

  it("does not toast after unmount during refresh", async () => {
    const refresh = deferred<unknown>();
    mocks.update.mockResolvedValue({
      id: "123456789012345678901234",
      version: 2,
    });
    mocks.refetch.mockReturnValue(refresh.promise);
    await act(async () =>
      root.render(
        React.createElement(Harness, { pageId: "123456789012345678901234" }),
      ),
    );
    await act(async () => container.querySelector("button")?.click());
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => refresh.resolve({ isSuccess: true }));
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
