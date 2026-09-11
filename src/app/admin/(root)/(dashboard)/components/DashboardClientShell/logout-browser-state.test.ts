import { describe, expect, it, vi } from "vitest";
import {
  clearHoneycombRuntimeCaches,
  navigateToAdminLogin,
} from "./logout-browser-state";

describe("logout browser state", () => {
  it("deletes every runtime cache while preserving precache assets", async () => {
    const cacheStorage = {
      keys: vi.fn().mockResolvedValue([
        "serwist-precache-v2",
        "workbox-precache-v2",
        "apis",
        "pages-rsc",
        "legacy-runtime-cache",
      ]),
      delete: vi.fn().mockResolvedValue(true),
    };

    await clearHoneycombRuntimeCaches(cacheStorage);

    expect(cacheStorage.delete).toHaveBeenCalledTimes(3);
    expect(cacheStorage.delete).toHaveBeenCalledWith("apis");
    expect(cacheStorage.delete).toHaveBeenCalledWith("pages-rsc");
    expect(cacheStorage.delete).toHaveBeenCalledWith("legacy-runtime-cache");
    expect(cacheStorage.delete).not.toHaveBeenCalledWith("serwist-precache-v2");
    expect(cacheStorage.delete).not.toHaveBeenCalledWith("workbox-precache-v2");
  });

  it("uses the supplied location boundary for a hard login navigation", () => {
    const replace = vi.fn();

    navigateToAdminLogin({ replace });

    expect(replace).toHaveBeenCalledWith("/admin/login");
  });
});
