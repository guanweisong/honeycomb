import { File as NodeFile } from "node:buffer";
import { webcrypto } from "node:crypto";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { trpcClient } from "@/lib/trpc/client/trpc";

import { Permission } from "@/lib/auth/permissions";
import type { MediaRecord as MediaViewModel } from "@/features/media/types/media.record";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let accountId: string | undefined = "user-1";
let allowedPermissions = new Set<Permission>();
const existingMedia: MediaViewModel = {
  id: "media-1",
  name: "cover.png",
  type: "image/png",
  url: "https://cdn.example.test/cover.png",
  key: "media/cover.png",
  size: 1,
  width: null,
  height: null,
  color: null,
  createdAt: null,
  updatedAt: null,
};
const uploadedMedia: MediaViewModel = {
  id: "media-2",
  name: "image.png",
  type: "image/png",
  size: 5,
  key: "media/image.png",
  url: "https://cdn.example.test/image.png",
  width: null,
  height: null,
  color: null,
  createdAt: null,
  updatedAt: null,
};
const nextMedia: MediaViewModel = {
  id: "media-3",
  name: "next.png",
  type: "image/png",
  url: "https://cdn.example.test/next.png",
  key: "media/next.png",
  size: 1,
  width: null,
  height: null,
  color: null,
  createdAt: null,
  updatedAt: null,
};
// TanStack Query retains data references while the server result is unchanged.
const mediaPages = {
  first: { list: [existingMedia], total: 2 },
  second: { list: [nextMedia], total: 2 },
};
const trpcMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  request: vi.fn<typeof trpcClient.media.index.query>(),
  prepareUpload: vi.fn(),
  input: undefined as { page?: number; limit?: number } | undefined,
  refetch: vi.fn(),
  registerUpload: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: accountId ? { id: accountId } : undefined }),
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpcClient: {
    media: {
      index: {
        query: (input: Parameters<typeof trpcClient.media.index.query>[0]) => {
          trpcMocks.input = input;
          return trpcMocks.request(input);
        },
      },
    },
  },
  trpc: {
    media: {
      destroy: { useMutation: () => ({ mutateAsync: trpcMocks.destroy }) },
      prepareUpload: {
        useMutation: () => ({ mutateAsync: trpcMocks.prepareUpload }),
      },
      registerUpload: {
        useMutation: () => ({ mutateAsync: trpcMocks.registerUpload }),
      },
    },
  },
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));

vi.mock("sonner", () => ({ toast: toastMocks }));

vi.mock("@/components/Sheet", () => ({
  Sheet: ({
    children,
    onConfirm,
  }: {
    children: React.ReactNode;
    onConfirm: () => void;
  }) => (
    <div>
      {children}
      <button onClick={onConfirm}>confirm picker</button>
    </div>
  ),
}));
import PhotoPickerModal from "@/features/media/admin/components/PhotoPicker";
import { MediaPageShell } from "@/features/media/admin/components/MediaPageShell/index";
import { useMediaActions } from "@/features/media/admin/media-actions";
import { requireDefined } from "@tests/helpers/require-defined";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function changeFile(input: HTMLInputElement, file: File | File[]) {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: Array.isArray(file) ? file : [file],
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}

describe("MediaPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    trpcMocks.request.mockReset();
    trpcMocks.request.mockImplementation(async ({ page }) =>
      page === 2 ? mediaPages.second : mediaPages.first,
    );
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("File", NodeFile);
    accountId = "user-1";
    allowedPermissions = new Set();
    trpcMocks.destroy.mockReset();
    trpcMocks.prepareUpload.mockReset();
    trpcMocks.input = undefined;
    trpcMocks.refetch.mockReset();
    trpcMocks.registerUpload.mockReset();
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
    toastMocks.warning.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    const reactRoot = createRoot(container);
    root = {
      render: (children) =>
        reactRoot.render(
          <QueryClientProvider client={client}>{children}</QueryClientProvider>,
        ),
      unmount: () => reactRoot.unmount(),
    };
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
    container.remove();
    vi.unstubAllGlobals();
  });

  it("uses ordinary media in management and pickers without lifecycle controls", async () => {
    await act(async () => root.render(<MediaPageShell />));
    expect(container.querySelector("select")).toBeNull();
    expect(container.textContent).not.toMatch(
      /媒体状态|检查状态|上传待确认|可使用/,
    );
    expect(trpcMocks.input).toEqual({ page: 1, limit: 50 });
    await act(async () => root.render(<MediaPageShell onSelect={vi.fn()} />));
    expect(container.querySelector("select")).toBeNull();
    expect(trpcMocks.input).toEqual({ page: 1, limit: 50 });
  });
  it("does not apply an old account upload or override a newer selection", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    const pending = createDeferred<unknown>();
    trpcMocks.prepareUpload.mockReturnValue(pending.promise);
    await act(async () => root.render(<MediaPageShell onSelect={onSelect} />));
    await changeFile(
      requireDefined(
        container.querySelector<HTMLInputElement>('input[type="file"]'),
      ),
      new File(["x"], "x.png", { type: "image/png" }),
    );
    accountId = "user-2";
    await act(async () => root.render(<MediaPageShell onSelect={onSelect} />));
    onSelect.mockClear();
    await act(async () => pending.reject(new Error("old account request")));
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
  it("blocks duplicate uploads and does not replace a newer user selection", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    const pending = createDeferred<Response>();
    trpcMocks.prepareUpload.mockResolvedValue({
      intent: "media-2",
      uploadUrl: "https://temp.test/x",
      expiresAt: "later",
    });
    trpcMocks.registerUpload.mockResolvedValue(uploadedMedia);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pending.promise),
    );
    await act(async () => root.render(<MediaPageShell onSelect={onSelect} />));
    const input = requireDefined(
      container.querySelector<HTMLInputElement>('input[type="file"]'),
    );
    const file = new File(["x"], "x.png", { type: "image/png" });
    await changeFile(input, file);
    await changeFile(input, file);
    expect(trpcMocks.prepareUpload).toHaveBeenCalledTimes(1);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[title="cover.png"]')
        ?.click(),
    );
    await act(async () => pending.resolve(new Response(null, { status: 200 })));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(existingMedia);
  });
  it("preserves selection until deletion succeeds", async () => {
    allowedPermissions = new Set([Permission.mediaDelete]);
    const onSelect = vi.fn();
    const pending = createDeferred<{ success: true }>();
    trpcMocks.destroy.mockReturnValue(pending.promise);
    await act(async () => root.render(<MediaPageShell onSelect={onSelect} />));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[title="cover.png"]')
        ?.click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="删除 cover.png"]')
        ?.click(),
    );
    await act(async () =>
      Array.from(document.body.querySelectorAll("button"))
        .find((b) => b.textContent === "确定")
        ?.click(),
    );
    expect(onSelect).toHaveBeenLastCalledWith(existingMedia);
    expect(
      container.querySelector<HTMLButtonElement>('[title="cover.png"]')
        ?.disabled,
    ).toBe(true);
    await act(async () => pending.resolve({ success: true }));
    expect(onSelect).toHaveBeenLastCalledWith(undefined);
  });
  it("blocks duplicate delete clicks while an operation is pending", async () => {
    const pending = createDeferred<{ success: true }>();
    trpcMocks.destroy.mockReturnValue(pending.promise);
    let actions: ReturnType<typeof useMediaActions> | undefined;
    function Harness() {
      actions = useMediaActions({
        refetch: vi.fn(),
        onUploadComplete: vi.fn(),
        onDeleteComplete: vi.fn(),
      });
      return null;
    }
    await act(async () => root.render(<Harness />));
    const first = requireDefined(actions).handleDelete("media-1");
    expect(await requireDefined(actions).handleDelete("media-1")).toBe(false);
    pending.resolve({ success: true });
    await first;
    expect(trpcMocks.destroy).toHaveBeenCalledTimes(1);
  });
  it("keeps the upload control behind its existing upload permission", async () => {
    await act(async () => root.render(React.createElement(MediaPageShell)));
    expect(container.textContent).not.toContain("点击上传文件");
    expect(container.querySelector('input[type="file"]')).toBeNull();

    allowedPermissions = new Set([Permission.mediaUpload]);
    await act(async () => root.render(React.createElement(MediaPageShell)));
    expect(container.textContent).toContain("点击上传文件");
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
  });

  it("loads the next page when the bottom sentinel enters the viewport", async () => {
    const observers: Array<{
      callback: (entries: Array<IntersectionObserverEntry>) => void;
      disconnect: ReturnType<typeof vi.fn>;
      observe: ReturnType<typeof vi.fn>;
    }> = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        callback: (entries: Array<IntersectionObserverEntry>) => void;
        disconnect = vi.fn();
        observe = vi.fn();

        constructor(
          callback: (entries: Array<IntersectionObserverEntry>) => void,
        ) {
          this.callback = callback;
          observers.push(this);
        }
      },
    );

    await act(async () => root.render(React.createElement(MediaPageShell)));
    expect(trpcMocks.input).toEqual({ page: 1, limit: 50 });
    expect(observers.length).toBeGreaterThan(0);

    await act(async () => {
      observers
        .at(-1)
        ?.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(trpcMocks.input).toEqual({ page: 2, limit: 50 });
    expect(container.querySelector('[title="next.png"]')).not.toBeNull();
  });

  it.each(["account", "signout", "unmount", "observer"] as const)(
    "ignores a queued sentinel callback after %s changes",
    async (change) => {
      const callbacks: Array<(entries: IntersectionObserverEntry[]) => void> =
        [];
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          observe = vi.fn();
          disconnect = vi.fn();
          constructor(
            callback: (entries: IntersectionObserverEntry[]) => void,
          ) {
            callbacks.push(callback);
          }
        },
      );
      if (change === "observer") {
        trpcMocks.request.mockImplementation(async ({ page }) => ({
          list: [
            page === 1 ? existingMedia : page === 2 ? nextMedia : uploadedMedia,
          ],
          total: 3,
        }));
      }
      await act(async () => root.render(<MediaPageShell />));
      const queuedCallback = requireDefined(callbacks.at(-1));
      if (change === "observer") {
        // Loading page 2 replaces the observer while the original callback can still be queued.
        await act(async () =>
          queuedCallback([
            { isIntersecting: true } as IntersectionObserverEntry,
          ]),
        );
      } else {
        accountId = change === "account" ? "user-2" : undefined;
        await act(async () =>
          root.render(change === "unmount" ? null : <MediaPageShell />),
        );
      }
      const calls = trpcMocks.request.mock.calls.length;

      await act(async () =>
        queuedCallback([{ isIntersecting: true } as IntersectionObserverEntry]),
      );

      expect(trpcMocks.request).toHaveBeenCalledTimes(calls);
      if (change === "account" || change === "observer") {
        const currentCallback = requireDefined(callbacks.at(-1));
        await act(async () =>
          currentCallback([
            { isIntersecting: true } as IntersectionObserverEntry,
          ]),
        );
        expect(trpcMocks.request).toHaveBeenCalledTimes(calls + 1);
        expect(trpcMocks.input).toEqual({
          page: change === "account" ? 2 : 3,
          limit: 50,
        });
        expect(
          container.querySelector(
            change === "account" ? '[title="next.png"]' : '[title="image.png"]',
          ),
        ).not.toBeNull();
      }
    },
  );

  it("uploads through the file input with loading, storage, selection, and refresh behavior", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    const storageResponse = createDeferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(storageResponse.promise);
    vi.stubGlobal("fetch", fetchMock);
    trpcMocks.prepareUpload.mockResolvedValue({
      uploadUrl: "https://upload.example.test/image.png",
      intent: "media-2",
      expiresAt: "later",
    });
    trpcMocks.registerUpload.mockResolvedValue(uploadedMedia);
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["movie"], "image.png", { type: "image/png" });
    expect(input).not.toBeNull();
    await changeFile(requireDefined(input), file);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(container.textContent).toContain("正在上传…");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://upload.example.test/image.png",
      {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/png" },
      },
    );

    await act(async () => {
      storageResponse.resolve(new Response(null, { status: 200 }));
      await Promise.resolve();
    });
    await vi.waitFor(() =>
      expect(toastMocks.success).toHaveBeenCalledWith("成功上传 1 个文件"),
    );

    expect(trpcMocks.registerUpload).toHaveBeenCalledWith({
      intent: "media-2",
    });
    expect(trpcMocks.request).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(uploadedMedia);
    expect(container.textContent).toContain("点击上传文件");
  });

  it("restores loading and avoids selection when upload fails", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    const presignedUrl = createDeferred<{ url: string; key: string }>();
    trpcMocks.prepareUpload.mockReturnValue(presignedUrl.promise);
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    await changeFile(
      requireDefined(input),
      new File(["movie"], "image.png", { type: "image/png" }),
    );
    expect(container.textContent).toContain("正在上传…");

    await act(async () => {
      presignedUrl.reject(new Error("上传服务不可用"));
      await Promise.resolve();
    });
    await vi.waitFor(() =>
      expect(toastMocks.error).toHaveBeenCalledWith(
        "image.png: 上传服务不可用；请人工核对后重试",
      ),
    );

    expect(container.textContent).toContain("点击上传文件");
    expect(trpcMocks.request).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "does not retry a committed media deletion when refresh fails (async: %s)",
    async (asyncFailure) => {
      trpcMocks.destroy.mockResolvedValue({ success: true });
      const onDeleteComplete = vi.fn();
      let actions: ReturnType<typeof useMediaActions> | undefined;
      function Harness() {
        actions = useMediaActions({
          refetch: () => {
            if (asyncFailure)
              return Promise.reject(new Error("refresh failed"));
            throw new Error("refresh failed");
          },
          onUploadComplete: vi.fn(),
          onDeleteComplete,
        });
        return null;
      }
      await act(async () => root.render(<Harness />));
      await expect(
        requireDefined(actions).handleDelete("media-1"),
      ).resolves.toBe(true);
      expect(onDeleteComplete).toHaveBeenCalledExactlyOnceWith("media-1");
      expect(trpcMocks.destroy).toHaveBeenCalledOnce();
    },
  );

  it.each(["scope", "unmount"] as const)(
    "ignores a late degraded deletion after %s changes",
    async (change) => {
      const pending = createDeferred<{
        success: true;
        publicSync: "degraded";
      }>();
      trpcMocks.destroy.mockReturnValue(pending.promise);
      const onDeleteComplete = vi.fn();
      let actions: ReturnType<typeof useMediaActions> | undefined;
      let scopeKey = "first";
      function Harness() {
        actions = useMediaActions({
          scopeKey,
          refetch: trpcMocks.refetch,
          onDeleteComplete,
          onUploadComplete: vi.fn(),
        });
        return null;
      }
      await act(async () => root.render(<Harness />));
      let result: Promise<boolean> | undefined;
      await act(async () => {
        result = requireDefined(actions).handleDelete("media-1");
      });
      scopeKey = "second";
      await act(async () =>
        root.render(change === "scope" ? <Harness /> : null),
      );
      await act(async () =>
        pending.resolve({ success: true, publicSync: "degraded" }),
      );
      await expect(result).resolves.toBe(false);
      expect(onDeleteComplete).not.toHaveBeenCalled();
      expect(toastMocks.warning).not.toHaveBeenCalled();
      expect(toastMocks.success).not.toHaveBeenCalled();
      expect(trpcMocks.refetch).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    "warns on committed degraded deletion and closes the dialog (refresh fails: %s)",
    async (refreshFails) => {
      allowedPermissions = new Set([Permission.mediaDelete]);
      const onSelect = vi.fn();
      trpcMocks.destroy.mockResolvedValue({
        success: true,
        publicSync: "degraded",
      });
      if (refreshFails)
        trpcMocks.request
          .mockResolvedValueOnce(mediaPages.first)
          .mockRejectedValueOnce(new Error("refresh failed"));
      await act(async () =>
        root.render(<MediaPageShell onSelect={onSelect} />),
      );
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[title="cover.png"]')
          ?.click(),
      );
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>('[aria-label="删除 cover.png"]')
          ?.click(),
      );
      await act(async () =>
        Array.from(document.body.querySelectorAll("button"))
          .find((button) => button.textContent === "确定")
          ?.click(),
      );
      expect(trpcMocks.destroy).toHaveBeenCalledOnce();
      expect(toastMocks.warning).toHaveBeenCalledWith(
        "已删除，公开内容同步未完成，请稍后检查公开页面",
      );
      expect(toastMocks.success).not.toHaveBeenCalled();
      expect(toastMocks.error).not.toHaveBeenCalled();
      expect(onSelect).toHaveBeenLastCalledWith(undefined);
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    },
  );

  it("deletes the selected media and invalidates the external selection", async () => {
    allowedPermissions = new Set([Permission.mediaDelete]);
    const onSelect = vi.fn();
    trpcMocks.destroy.mockResolvedValue({ success: true });
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const tile = container.querySelector('[title="cover.png"]');
    await act(async () =>
      tile?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const deleteButton = Array.from(container.querySelectorAll("button")).at(
      -1,
    );
    await act(async () => deleteButton?.click());
    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "确定");
    expect(confirmButton).toBeDefined();
    await act(async () => confirmButton?.click());
    await vi.waitFor(() => expect(trpcMocks.destroy).toHaveBeenCalledOnce());

    expect(trpcMocks.destroy).toHaveBeenCalledWith({
      ids: ["media-1"],
      acknowledgeUnknownReferences: true,
    });
    expect(toastMocks.success).toHaveBeenCalledWith("删除成功");
    expect(trpcMocks.request).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(undefined);
    expect(
      container.querySelector('[title="cover.png"]')?.className,
    ).not.toContain("border-blue-500");
  });

  it.each(["success", "failed"] as const)(
    "composed picker clears only successfully deleted selections: %s",
    async (outcome) => {
      allowedPermissions = new Set([Permission.mediaDelete]);
      const onConfirm = vi.fn();
      if (outcome === "failed")
        trpcMocks.destroy.mockRejectedValue(
          Object.assign(new Error("failed"), { data: { code: "CONFLICT" } }),
        );
      else trpcMocks.destroy.mockResolvedValue({ success: true });
      await act(async () =>
        root.render(
          <PhotoPickerModal
            showPhotoPicker
            handlePhotoPickerOk={onConfirm}
            handlePhotoPickerCancel={vi.fn()}
            pickerContent={(onSelect) => <MediaPageShell onSelect={onSelect} />}
          />,
        ),
      );
      await act(async () =>
        container
          .querySelector('[title="cover.png"]')
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
      const remove = container.querySelector<HTMLButtonElement>(
        '[aria-label="删除 cover.png"]',
      );
      expect(remove).not.toBeNull();
      await act(async () => remove?.click());
      const confirmDelete = Array.from(
        document.body.querySelectorAll("button"),
      ).find((button) => button.textContent === "确定");
      expect(confirmDelete).toBeDefined();
      await act(async () => confirmDelete?.click());
      if (outcome !== "success")
        expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
      await act(async () =>
        Array.from(container.querySelectorAll("button"))
          .find((button) => button.textContent === "confirm picker")
          ?.click(),
      );
      if (outcome === "success") {
        expect(onConfirm).not.toHaveBeenCalled();
        expect(toastMocks.info).toHaveBeenCalledWith("请选择图片");
      } else expect(onConfirm).toHaveBeenCalledWith(existingMedia);
    },
  );

  it("retains the row and selection when deletion fails", async () => {
    allowedPermissions = new Set([Permission.mediaDelete]);
    const onSelect = vi.fn();
    trpcMocks.destroy.mockRejectedValue(
      Object.assign(new Error("删除失败"), { data: { code: "CONFLICT" } }),
    );
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const tile = container.querySelector('[title="cover.png"]');
    await act(async () =>
      tile?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const deleteButton = Array.from(container.querySelectorAll("button")).at(
      -1,
    );
    await act(async () => deleteButton?.click());
    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "确定");
    await act(async () => confirmButton?.click());
    await vi.waitFor(() =>
      expect(toastMocks.error).toHaveBeenCalledWith(
        expect.stringContaining("删除失败"),
      ),
    );

    expect(trpcMocks.request).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith(existingMedia);
    expect(
      container.querySelector<HTMLButtonElement>('[title="cover.png"]')
        ?.disabled,
    ).toBe(false);
  });

  it("retains partial success without client-side cleanup", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    trpcMocks.prepareUpload.mockImplementation(async ({ name }) => ({
      intent: name,
      uploadUrl: `https://storage.test/${name}`,
      expiresAt: "later",
    }));
    trpcMocks.registerUpload.mockImplementation(
      async ({ intent }: { intent: string }) => {
        if (intent === "bad.png") throw new Error("invalid image");
        return uploadedMedia;
      },
    );
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => {
      void _url;
      void _options;
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => root.render(<MediaPageShell onSelect={onSelect} />));
    await changeFile(
      requireDefined(
        container.querySelector<HTMLInputElement>('input[type="file"]'),
      ),
      [
        new File(["a"], "image.png", { type: "image/png" }),
        new File(["b"], "bad.png", { type: "image/png" }),
      ],
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.every((call) => call[1]?.method === "PUT"),
    ).toBe(true);
    expect(onSelect).toHaveBeenCalledWith(uploadedMedia);
    expect(trpcMocks.request).toHaveBeenCalledTimes(2);
    expect(toastMocks.error).toHaveBeenCalledWith(
      expect.stringContaining("成功上传 1 个文件，1 个失败"),
    );
  });
  it("keeps a possibly committed object and refreshes the list when metadata response is lost", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    trpcMocks.prepareUpload.mockResolvedValue({
      intent: "image.png",
      uploadUrl: "https://storage.test/image.png",
      expiresAt: "later",
    });
    trpcMocks.registerUpload.mockRejectedValue(new Error("response lost"));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => root.render(<MediaPageShell />));
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("file input missing");
    await changeFile(
      input,
      new File(["a"], "image.png", { type: "image/png" }),
    );
    await vi.waitFor(() =>
      expect(toastMocks.error).toHaveBeenCalledWith(
        expect.stringContaining("response lost"),
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(trpcMocks.request).toHaveBeenCalledTimes(2);
  });
});
