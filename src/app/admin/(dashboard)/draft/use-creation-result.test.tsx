import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { expect, it, vi } from "vitest";
import { useCreationResult } from "./use-creation-result";

const mocks = vi.hoisted(() => ({
  post: { query: vi.fn(), invalidate: vi.fn() },
  page: { query: vi.fn(), invalidate: vi.fn() },
}));

vi.mock("@/lib/trpc/client/trpc", () => {
  const procedure = (kind: keyof typeof mocks) => ({
    _def: () => ({ path: [kind, "creationResult"] }),
  });
  return {
    trpc: {
      post: { creationResult: procedure("post") },
      page: { creationResult: procedure("page") },
      useUtils: () => ({
        client: {
          post: { creationResult: { query: mocks.post.query } },
          page: { creationResult: { query: mocks.page.query } },
        },
        post: { adminIndex: { invalidate: mocks.post.invalidate } },
        page: { adminIndex: { invalidate: mocks.page.invalidate } },
      }),
    },
  };
});

it.each(["post", "page"] as const)(
  "only checks the owner's %s receipt and refreshes the list after unmount",
  async (kind) => {
    vi.resetAllMocks();
    const pending = Promise.withResolvers<{ id: string; version: number }>();
    mocks[kind].query.mockReturnValue(pending.promise);
    mocks[kind].invalidate.mockRejectedValue(new Error("refresh unavailable"));
    const token = "11111111-1111-4111-8111-111111111111";
    const readReceipt = (actorId: string, receiptToken: string) =>
      actorId === "owner" && receiptToken === token;
    const client = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender, unmount } = renderHook(
      ({ actorId }) => useCreationResult(kind, token, actorId, readReceipt),
      { initialProps: { actorId: "other-account" }, wrapper },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(mocks[kind].query).not.toHaveBeenCalled();

    rerender({ actorId: "owner" });
    await waitFor(() =>
      expect(mocks[kind].query).toHaveBeenCalledExactlyOnceWith({
        creationToken: token,
      }),
    );
    unmount();
    pending.resolve({ id: "created", version: 1 });
    await waitFor(() => expect(mocks[kind].invalidate).toHaveBeenCalledOnce());
    const otherKind = kind === "post" ? "page" : "post";
    expect(mocks[otherKind].query).not.toHaveBeenCalled();
    expect(mocks[otherKind].invalidate).not.toHaveBeenCalled();
    client.clear();
  },
);
