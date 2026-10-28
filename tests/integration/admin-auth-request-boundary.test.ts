// @vitest-environment node
// Initialize the same AsyncLocalStorage prerequisite as the installed Next server.
import "next/dist/server/node-environment-baseline";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import { createWorkStore } from "next/dist/server/async-storage/work-store";
import { createRequestStore } from "next/dist/server/async-storage/request-store";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";
import {
  workUnitAsyncStorage,
  type PrerenderStoreModernRuntime,
  type WorkUnitStore,
} from "next/dist/server/app-render/work-unit-async-storage.external";
import { RenderStage } from "next/dist/server/app-render/staged-rendering";
import { getAdminUser } from "@/app/admin/lib/admin-auth";

const mocks = vi.hoisted(() => ({
  getAdminUser: vi.fn(),
  getDb: vi.fn(() => ({})),
  repository: {},
}));
vi.mock("@/features/user/server/admin-user", () => ({
  getAdminUser: mocks.getAdminUser,
}));
vi.mock("@/lib/db/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/features/user/server/user-repository", () => ({
  createUserRepository: () => mocks.repository,
}));

function requestStore(pathname: string) {
  return createRequestStore({
    phase: "render",
    headers: new Headers({ cookie: "session=synthetic-test-session" }),
    onUpdateCookies: undefined,
    url: { pathname },
    rootParams: {},
    implicitTags: { tags: [], expirationsByCacheKind: new Map() },
    resumeDataCache: null,
    previewProps: undefined,
    isHmrRefresh: undefined,
    serverComponentsHmrCache: undefined,
    hmrRefreshHash: undefined,
    stagedFallbackParams: null,
  });
}

function runInNext<T>(pathname: string, store: WorkUnitStore, run: () => T): T {
  const work = createWorkStore({
    page: `${pathname}/page`,
    buildId: "auth-boundary-test",
    deploymentId: "auth-boundary-test",
    previouslyRevalidatedTags: [],
    renderOpts: {
      cacheLifeProfiles: { default: { stale: 0, revalidate: 0, expire: 0 } },
      staticPageGenerationTimeout: 60,
      cacheComponents: true,
      validationLevel: "warning",
      experimental: {
        isRoutePPREnabled: true,
        authInterrupts: false,
        useCacheTimeout: 5000,
        durableUseCacheEntries: false,
      },
      onClose: () => {},
      waitUntil: undefined,
      onAfterTaskError: undefined,
    },
  });
  return workAsyncStorage.run(work, () => workUnitAsyncStorage.run(store, run));
}

describe("admin auth with the installed Next request APIs", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(["/admin/dashboard", "/admin/login"])(
    "does not start auth/DB during %s runtime prerender even when headers resolve",
    async (pathname) => {
      const request = requestStore(pathname);
      const controller = new AbortController();
      const prerender: PrerenderStoreModernRuntime = {
        type: "prerender-runtime",
        phase: "render",
        implicitTags: request.implicitTags,
        stagedRendering: null,
        finalStage: RenderStage.ShellRuntime,
        headers: request.headers,
        cookies: request.cookies,
        draftMode: request.draftMode,
        controller,
        renderSignal: controller.signal,
        cacheSignal: null,
        dynamicTracking: null,
        rootParams: {},
        resumeDataCache: null,
        hmrRefreshHash: undefined,
        varyParamsAccumulator: null,
        revalidate: 0,
        expire: 0,
        stale: 0,
        tags: null,
      };
      await runInNext(pathname, prerender, async () => {
        const requestHeaders = await headers();
        expect(requestHeaders.get("cookie")).toBe(
          "session=synthetic-test-session",
        );
        const pending = getAdminUser(requestHeaders);
        // Observe rejection immediately and always settle it before ending the test.
        const settled = Promise.allSettled([pending]);
        try {
          await Promise.resolve();
          expect(mocks.getAdminUser).not.toHaveBeenCalled();
          expect(mocks.getDb).not.toHaveBeenCalled();
        } finally {
          controller.abort();
          await settled;
        }
        expect(await settled).toMatchObject([
          {
            status: "rejected",
            reason: { digest: "HANGING_PROMISE_REJECTION" },
          },
        ]);
      });
    },
  );

  it.each([
    {
      id: "user-1",
      email: null,
      name: "Admin",
      level: "ADMIN",
      status: "ENABLE",
    },
    null,
  ])("preserves real-request identity/anonymous results: %j", async (user) => {
    mocks.getAdminUser.mockResolvedValueOnce(user);
    await runInNext("/admin", requestStore("/admin"), async () => {
      const requestHeaders = await headers();
      await expect(getAdminUser(requestHeaders)).resolves.toBe(user);
      expect(mocks.getAdminUser).toHaveBeenCalledTimes(1);
      expect(mocks.getAdminUser.mock.calls[0]?.[0]).toBe(requestHeaders);
      expect(mocks.getAdminUser.mock.calls[0]?.[1]).toBe(mocks.repository);
      expect(mocks.getDb).toHaveBeenCalledTimes(1);
    });
  });

  it("does not turn an authentication or database failure into an anonymous result", async () => {
    const failure = new Error("synthetic auth failure");
    mocks.getAdminUser.mockRejectedValueOnce(failure);
    await runInNext("/admin", requestStore("/admin"), async () => {
      await expect(getAdminUser(await headers())).rejects.toBe(failure);
    });
  });
});
