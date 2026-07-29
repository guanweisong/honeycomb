import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

import { Permission } from "@/packages/auth/permissions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let allowedPermissions = new Set<Permission>();
const media = {
  id: "media-1",
  name: "cover.png",
  type: "image/png",
  url: "https://cdn.example.test/cover.png",
};
const trpcMocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("@/app/admin/hooks/useCurrentUser", () => ({
  useCan: (permission: Permission) => allowedPermissions.has(permission),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    media: {
      index: {
        useQuery: () => ({
          data: { list: [media] },
          refetch: trpcMocks.refetch,
        }),
      },
      destroy: { useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }) },
      getPresignedUrl: {
        useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }),
      },
      upload: { useMutation: () => ({ mutateAsync: trpcMocks.mutateAsync }) },
    },
  },
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", props),
}));

import { MediaPageShell } from "./MediaPageShell";

describe("MediaPageShell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    allowedPermissions = new Set();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
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
});
