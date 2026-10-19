import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";

const mocks = vi.hoisted(() => ({
  saveAll: vi.fn(),
  refetch: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, warning: mocks.warning, error: mocks.error },
}));
vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    menu: { saveAll: { useMutation: () => ({ mutateAsync: mocks.saveAll }) } },
  },
}));

import { useMenuActions } from "./menu-actions";

let actions: ReturnType<typeof useMenuActions> | undefined;
function Harness() {
  const currentActions = useMenuActions([], mocks.refetch);
  React.useEffect(() => {
    actions = currentActions;
  }, [currentActions]);
  return null;
}

describe("Menu public-sync feedback", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    actions = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<Harness />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("waits for refresh without treating its rejection as a failed write", async () => {
    mocks.saveAll.mockResolvedValue({ count: 0, publicSync: "completed" });
    let rejectRefresh: ((reason: Error) => void) | undefined;
    mocks.refetch.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRefresh = reject;
        }),
    );
    const settled = vi.fn();
    const submission = requireDefined(actions)
      .submit()
      .then((state) => {
        settled(state);
        return state;
      });

    await Promise.resolve();
    await Promise.resolve();
    try {
      expect(mocks.refetch).toHaveBeenCalledOnce();
      expect(settled).not.toHaveBeenCalled();
    } finally {
      requireDefined(rejectRefresh)(new Error("refresh failed"));
      await expect(submission).resolves.toBe("success");
    }
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each([
    { publicSync: "completed", refreshFails: false },
    { publicSync: "degraded", refreshFails: false },
    { publicSync: "completed", refreshFails: true },
    { publicSync: "degraded", refreshFails: true },
  ])(
    "keeps committed $publicSync writes successful (refresh rejects: $refreshFails)",
    async ({ publicSync, refreshFails }) => {
      mocks.saveAll.mockResolvedValue({ count: 0, publicSync });
      if (refreshFails)
        mocks.refetch.mockRejectedValue(new Error("refresh failed"));

      await expect(requireDefined(actions).submit()).resolves.toBe("success");

      expect(mocks.saveAll).toHaveBeenCalledExactlyOnceWith([]);
      expect(mocks.refetch).toHaveBeenCalledOnce();
      expect(mocks.error).not.toHaveBeenCalled();
      if (publicSync === "degraded") {
        expect(mocks.warning).toHaveBeenCalledExactlyOnceWith(
          "已保存，公开内容同步未完成，请稍后检查公开页面",
        );
        expect(mocks.success).not.toHaveBeenCalled();
      } else {
        expect(mocks.success).toHaveBeenCalledExactlyOnceWith("更新成功");
        expect(mocks.warning).not.toHaveBeenCalled();
      }
    },
  );
});
