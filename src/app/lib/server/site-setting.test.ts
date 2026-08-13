import { describe, expect, it, vi } from "vitest";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/packages/trpc/api", () => ({ createServerClient }));

import { getSiteSetting } from "./site-setting";

describe("getSiteSetting", () => {
  it("forwards request headers to the server caller", async () => {
    const setting = { siteName: "Honeycomb" };
    const index = vi.fn().mockResolvedValue(setting);
    createServerClient.mockResolvedValue({ setting: { index } });
    const headers = new Headers({ cookie: "session=test" });

    await expect(getSiteSetting(headers)).resolves.toEqual(setting);
    expect(createServerClient).toHaveBeenCalledWith(headers);
  });
});
