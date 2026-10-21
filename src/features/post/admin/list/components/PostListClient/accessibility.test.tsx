import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
vi.mock("@/features/user/admin/use-current-user", () => ({
  useCan: () => false,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    post: {
      adminIndex: {
        useQuery: () => ({
          data: { list: [], total: 0 },
          isFetching: false,
          isError: false,
        }),
      },
      destroy: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    },
  },
}));
import PostListClient from "./index";
it("associates the post search field with a persistent label", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<PostListClient />));
    const input = container.querySelector<HTMLInputElement>(
      'input[name="title"]',
    );
    expect(input).not.toBeNull();
    expect(
      document.getElementById(input?.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("搜索文章");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
