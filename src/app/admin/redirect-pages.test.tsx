import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

import PostRedirect from "@/app/admin/(dashboard)/post/page";
import PageRedirect from "@/app/admin/(dashboard)/page/page";

beforeEach(() => vi.clearAllMocks());

describe.each([
  { Page: PostRedirect, target: "/admin/post/list" },
  { Page: PageRedirect, target: "/admin/page/list" },
])("admin root redirect to $target", ({ Page, target }) => {
  it("waits for client mounting instead of redirecting during server rendering", () => {
    expect(renderToString(<Page />)).toBe("");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("replaces the current history entry after mounting without rendering content", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<Page />));
      expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(target);
      expect(navigation.push).not.toHaveBeenCalled();
      expect(container.textContent).toBe("");
    } finally {
      await act(async () => root.unmount());
    }
  });
});
