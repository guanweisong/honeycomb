import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  isCancelledError,
} from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";
import { TRPCClientError } from "@trpc/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client/trpc";
import type { SettingRecord } from "../types";
import { SiteSettingProvider, useSiteSetting } from "./use-site-setting";

const initial: SettingRecord = {
  id: "111111111111111111111111",
  version: 0,
  siteName: { en: "Initial", zh: "初始" },
  siteSubName: null,
  siteSignature: null,
  siteCopyright: null,
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: null,
  updatedAt: null,
};
const updated: SettingRecord = {
  ...initial,
  version: 1,
  siteName: { en: "Updated", zh: "更新" },
};
const key = getQueryKey(trpc.setting.index, undefined, "query");
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function setup(seed: SettingRecord | undefined) {
  const read = vi.fn<() => Promise<SettingRecord>>().mockResolvedValue(updated);
  const client = trpc.createClient({
    links: [
      () =>
        ({ op }) =>
          observable((observer) => {
            expect(op.path).toBe("setting.index");
            void read().then(
              (data) => {
                observer.next({ result: { data } });
                observer.complete();
              },
              (error) => observer.error(TRPCClientError.from(error)),
            );
          }),
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  let current: ReturnType<typeof useSiteSetting>;
  function Consumer({ id }: { id: string }) {
    const value = useSiteSetting();
    current = value;
    return (
      <span data-consumer={id}>{value.setting?.siteName?.en ?? "empty"}</span>
    );
  }
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={client} queryClient={queryClient}>
          <SiteSettingProvider setting={seed}>
            <Consumer id="settings" />
            <Consumer id="dashboard" />
          </SiteSettingProvider>
        </trpc.Provider>
      </QueryClientProvider>,
    ),
  );
  cleanups.push(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
  });
  const settle = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };
  return {
    read,
    queryClient,
    container,
    refresh: () => current!.refreshSetting(),
    settle,
  };
}

describe("SiteSettingProvider with the real tRPC QueryClient", () => {
  it("seeds both consumers and the query cache without requesting fresh server data", async () => {
    const view = await setup(initial);
    expect(view.read).not.toHaveBeenCalled();
    expect(view.queryClient.getQueryData(key)).toEqual(initial);
    expect(view.container.textContent).toBe("InitialInitial");
  });

  it("loads the initial remote snapshot when no server seed exists", async () => {
    const view = await setup(undefined);
    await view.settle();
    expect(view.read).toHaveBeenCalledTimes(1);
    expect(view.queryClient.getQueryData(key)).toEqual(updated);
    expect(view.container.textContent).toBe("UpdatedUpdated");
  });

  it("forces a server request even while cached data is fresh, and updates every consumer", async () => {
    const view = await setup(initial);
    await act(async () => {
      expect(await view.refresh()).toEqual(updated);
    });
    await view.settle();
    expect(view.read).toHaveBeenCalledTimes(1);
    expect(view.queryClient.getQueryData(key)).toEqual(updated);
    expect(view.container.textContent).toBe("UpdatedUpdated");
  });

  it("rejects refresh errors without discarding the previous snapshot", async () => {
    const view = await setup(initial);
    view.read.mockRejectedValueOnce(new Error("refresh unavailable"));
    await act(async () => {
      await expect(view.refresh()).rejects.toThrow("refresh unavailable");
    });
    await view.settle();
    expect(view.queryClient.getQueryData(key)).toEqual(initial);
    expect(view.container.textContent).toBe("InitialInitial");
  });

  it("clears logout cache and cancels an in-flight refresh without accepting its late response", async () => {
    const view = await setup(initial);
    let resolve!: (value: SettingRecord) => void;
    view.read.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const result = view.refresh().catch((error) => error);
    expect(view.read).toHaveBeenCalledTimes(1);
    await act(async () => view.queryClient.clear());
    expect(isCancelledError(await result)).toBe(true);
    expect(view.queryClient.getQueryData(key)).toBeUndefined();
    await act(async () => resolve(updated));
    await view.settle();
    expect(view.queryClient.getQueryData(key)).toBeUndefined();
    // Logout navigates away. clear() removes cache entries, not mounted observer results.
    expect(view.container.textContent).toBe("InitialInitial");
  });
});
