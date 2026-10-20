import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCaller: vi.fn(),
  createContext: vi.fn(async () => ({})),
}));

vi.mock("./router", () => ({
  appRouter: { createCaller: mocks.createCaller },
}));
vi.mock("../../lib/trpc/context", () => ({
  createContext: mocks.createContext,
}));

import { createServerClient } from "./server";

describe("createServerClient", () => {
  it("passes current request headers into server context", async () => {
    mocks.createCaller.mockReturnValueOnce({});
    const headers = new Headers({ cookie: "better-auth.session_token=test" });

    await createServerClient(headers);

    expect(mocks.createContext).toHaveBeenCalledWith({
      req: expect.objectContaining({ headers }),
    });
  });
});
