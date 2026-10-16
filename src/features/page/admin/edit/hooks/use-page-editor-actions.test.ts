import React, { act, Suspense, use, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
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
let editorActions: ReturnType<typeof usePageEditorActions> | undefined;

function Harness({ pageId }: { pageId?: string }) {
  const actions = usePageEditorActions({ pageId, refetch: mocks.refetch });
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
      root.render(
        React.createElement(Harness, { pageId: "123456789012345678901234" }),
      ),
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

  it("keeps creation busy until the destination finishes navigating", async () => {
    const navigation = deferred<unknown>();
    mocks.create.mockResolvedValue({ id: "123456789012345678901234" });

    function Destination() {
      use(navigation.promise);
      return React.createElement("span", null, "destination");
    }

    function NavigationHarness() {
      const [navigated, setNavigated] = useState(false);
      const actions = usePageEditorActions({ refetch: mocks.refetch });
      useEffect(() => {
        mocks.push.mockImplementation(() => setNavigated(true));
      }, []);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "output",
          null,
          actions.loading ? "loading" : "idle",
        ),
        React.createElement(
          "button",
          { onClick: () => void actions.submit(values, PageStatus.PUBLISHED) },
          "submit",
        ),
        navigated && React.createElement(Destination),
      );
    }

    await act(async () =>
      root.render(
        React.createElement(
          Suspense,
          { fallback: "navigating" },
          React.createElement(NavigationHarness),
        ),
      ),
    );
    await act(async () => container.querySelector("button")?.click());

    expect(container.querySelector("output")?.textContent).toBe("loading");
    expect(container.textContent).not.toContain("navigating");
    await act(async () => navigation.resolve(undefined));

    expect(container.querySelector("output")?.textContent).toBe("idle");
    expect(container.textContent).toContain("destination");
  });

  it("waits for refresh and returns the confirmed save result", async () => {
    const refresh = deferred<unknown>();
    mocks.update.mockResolvedValue(undefined);
    mocks.refetch.mockReturnValue(refresh.promise);
    await act(async () =>
      root.render(
        React.createElement(Harness, { pageId: "123456789012345678901234" }),
      ),
    );
    let pending:
      ReturnType<ReturnType<typeof usePageEditorActions>["submit"]> | undefined;
    await act(async () => {
      pending = requireDefined(editorActions).submit(
        values,
        PageStatus.PUBLISHED,
      );
    });
    expect(container.textContent).toContain("loading");

    await act(async () => {
      refresh.resolve({ isSuccess: true });
      await expect(pending).resolves.toEqual({ state: "updated" });
    });
    expect(container.textContent).toContain("idle");
  });

  it("returns a saved result rather than rejecting when refresh fails", async () => {
    mocks.update.mockResolvedValue(undefined);
    mocks.refetch.mockRejectedValue(new Error("refetch unavailable"));
    await act(async () =>
      root.render(
        React.createElement(Harness, { pageId: "123456789012345678901234" }),
      ),
    );

    await act(async () => {
      await expect(
        requireDefined(editorActions).submit(values, PageStatus.PUBLISHED),
      ).resolves.toEqual({ state: "updated" });
    });
    expect(container.textContent).toContain("idle");
    expect(mocks.success).toHaveBeenCalledWith("更新成功");
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
