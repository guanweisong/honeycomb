import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { Permission } from "@/packages/auth/permissions";
import type { MediaEntity } from "@/packages/trpc/api/modules/media/types/media.entity";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let allowedPermissions = new Set<Permission>();
const existingMedia = {
  id: "media-1",
  name: "cover.png",
  type: "image/png",
  url: "https://cdn.example.test/cover.png",
} as MediaEntity;
const uploadedMedia = {
  id: "media-2",
  name: "movie.mp4",
  type: "video/mp4",
  size: 5,
  key: "media/movie.mp4",
  url: "https://cdn.example.test/movie.mp4",
  width: null,
  height: null,
  color: null,
} as MediaEntity;
const nextMedia = {
  id: "media-3",
  name: "next.png",
  type: "image/png",
  url: "https://cdn.example.test/next.png",
} as MediaEntity;
const trpcMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  getPresignedUrl: vi.fn(),
  input: undefined as { page?: number; limit?: number } | undefined,
  refetch: vi.fn(),
  upload: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    media: {
      index: {
        useQuery: (input: { page?: number; limit?: number }) => {
          trpcMocks.input = input;
          return {
          data: {
            list: input.page === 2 ? [nextMedia] : [existingMedia],
            total: 2,
          },
          isFetching: false,
          refetch: trpcMocks.refetch,
        };
        },
      },
      destroy: { useMutation: () => ({ mutateAsync: trpcMocks.destroy }) },
      getPresignedUrl: {
        useMutation: () => ({ mutateAsync: trpcMocks.getPresignedUrl }),
      },
      upload: { useMutation: () => ({ mutateAsync: trpcMocks.upload }) },
    },
  },
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));

vi.mock("sonner", () => ({ toast: toastMocks }));

import { MediaPageShell } from "./MediaPageShell";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function changeFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

describe("MediaPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    allowedPermissions = new Set();
    trpcMocks.destroy.mockReset();
    trpcMocks.getPresignedUrl.mockReset();
    trpcMocks.input = undefined;
    trpcMocks.refetch.mockReset();
    trpcMocks.upload.mockReset();
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
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

        constructor(callback: (entries: Array<IntersectionObserverEntry>) => void) {
          this.callback = callback;
          observers.push(this);
        }
      },
    );

    await act(async () => root.render(React.createElement(MediaPageShell)));
    expect(trpcMocks.input).toEqual({ page: 1, limit: 50 });
    expect(observers.length).toBeGreaterThan(0);

    await act(async () => {
      observers.at(-1)?.callback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });

    expect(trpcMocks.input).toEqual({ page: 2, limit: 50 });
    expect(container.querySelector('[title="next.png"]')).not.toBeNull();
  });

  it("uploads through the file input with loading, storage, selection, and refresh behavior", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    const storageResponse = createDeferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(storageResponse.promise);
    vi.stubGlobal("fetch", fetchMock);
    trpcMocks.getPresignedUrl.mockResolvedValue({
      url: "https://upload.example.test/movie.mp4",
      key: "media/movie.mp4",
    });
    trpcMocks.upload.mockResolvedValue(uploadedMedia);
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["movie"], "movie.mp4", { type: "video/mp4" });
    expect(input).not.toBeNull();
    await changeFile(input!, file);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(container.textContent).toContain("正在上传中...");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://upload.example.test/movie.mp4",
      {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "video/mp4" },
      },
    );

    await act(async () => {
      storageResponse.resolve(new Response(null, { status: 200 }));
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(toastMocks.success).toHaveBeenCalledWith("成功上传 1 个文件"));

    expect(trpcMocks.upload).toHaveBeenCalledWith({
      name: "movie.mp4",
      type: "video/mp4",
      size: 5,
      key: "media/movie.mp4",
      width: null,
      height: null,
      color: null,
    });
    expect(trpcMocks.refetch).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(uploadedMedia);
    expect(container.textContent).toContain("点击上传文件");
  });

  it("restores loading and avoids selection or refresh when upload fails", async () => {
    allowedPermissions = new Set([Permission.mediaUpload]);
    const onSelect = vi.fn();
    const presignedUrl = createDeferred<{ url: string; key: string }>();
    trpcMocks.getPresignedUrl.mockReturnValue(presignedUrl.promise);
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    await changeFile(
      input!,
      new File(["movie"], "movie.mp4", { type: "video/mp4" }),
    );
    expect(container.textContent).toContain("正在上传中...");

    await act(async () => {
      presignedUrl.reject(new Error("上传服务不可用"));
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("上传服务不可用"));

    expect(container.textContent).toContain("点击上传文件");
    expect(trpcMocks.refetch).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("deletes the selected media and clears only its internal selection", async () => {
    allowedPermissions = new Set([Permission.mediaDelete]);
    const onSelect = vi.fn();
    trpcMocks.destroy.mockResolvedValue({ success: true });
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const tile = container.querySelector('[title="cover.png"]');
    await act(async () => tile?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const deleteButton = Array.from(container.querySelectorAll("button")).at(-1);
    await act(async () => deleteButton?.click());
    const confirmButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent === "确定",
    );
    expect(confirmButton).toBeDefined();
    await act(async () => confirmButton?.click());
    await vi.waitFor(() => expect(trpcMocks.destroy).toHaveBeenCalledOnce());

    expect(trpcMocks.destroy).toHaveBeenCalledWith({ ids: ["media-1"] });
    expect(toastMocks.success).toHaveBeenCalledWith("删除成功");
    expect(trpcMocks.refetch).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(existingMedia);
    expect(container.querySelector('[title="cover.png"]')?.className).not.toContain(
      "border-blue-500",
    );
  });

  it("keeps selection intact when deletion fails", async () => {
    allowedPermissions = new Set([Permission.mediaDelete]);
    const onSelect = vi.fn();
    trpcMocks.destroy.mockRejectedValue(new Error("delete failed"));
    await act(async () =>
      root.render(React.createElement(MediaPageShell, { onSelect })),
    );

    const tile = container.querySelector('[title="cover.png"]');
    await act(async () => tile?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const deleteButton = Array.from(container.querySelectorAll("button")).at(-1);
    await act(async () => deleteButton?.click());
    const confirmButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent === "确定",
    );
    await act(async () => confirmButton?.click());
    await vi.waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("删除失败"));

    expect(trpcMocks.refetch).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(existingMedia);
  });
});
