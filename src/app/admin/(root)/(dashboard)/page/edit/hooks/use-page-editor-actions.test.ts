import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";

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
  update: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: mocks.success },
}));
vi.mock("@/packages/infrastructure/observability/client", () => ({
  clientLogger: { error: mocks.logger },
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    page: {
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));

import { usePageEditorActions } from "../actions/page-editor-actions";

const values = {
  title: { en: "About", zh: "关于" },
  content: { en: "English", zh: "中文" },
  template: PageTemplate.DEFAULT,
};

function Harness({ pageId }: { pageId?: string }) {
  const actions = usePageEditorActions({ pageId, refetch: mocks.refetch });
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
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("shows loading then redirects with the existing create success contract", async () => {
    const create = deferred<{ id: string }>();
    mocks.create.mockReturnValue(create.promise);
    await act(async () => root.render(React.createElement(Harness)));

    await act(async () => container.querySelector("button")?.click());
    expect(container.textContent).toContain("loading");

    await act(async () => {
      create.resolve({ id: "page-created" });
    });
    await vi.waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/admin/page/edit?id=page-created",
      ),
    );
    expect(mocks.success).toHaveBeenCalledWith("添加成功");
    expect(container.textContent).toContain("idle");
  });

  it("restores loading and keeps edit failures from refetching", async () => {
    mocks.update.mockRejectedValue(new Error("network unavailable"));
    await act(async () =>
      root.render(React.createElement(Harness, { pageId: "page-42" })),
    );

    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith("提交失败，请检查表单内容"),
    );

    expect(container.textContent).toContain("idle");
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.logger).toHaveBeenCalledWith(expect.anything(), {
      operation: "page.submit",
      outcome: "error",
    });
  });
});
