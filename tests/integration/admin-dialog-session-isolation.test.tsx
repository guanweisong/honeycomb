import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { EnableStatus } from "@/lib/validation/enable-status";
import type { UserRecord } from "@/features/user/types/user.record";
import type { LinkRecord } from "@/features/link/types/link.record";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), refetch: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock("@/lib/trpc/client/trpc", () => {
  const resource = {
    create: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
    update: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
    destroy: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
  };
  return { trpc: { user: resource, link: resource } };
});
import { useUserActions } from "@/features/user/admin/user-actions";
import { useLinkActions } from "@/features/link/admin/link-actions";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const id = "000000000000000000000001";
const user: UserRecord = {
  id,
  name: "Original",
  email: "user@example.test",
  level: UserLevel.EDITOR,
  status: UserStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
};
const link: LinkRecord = {
  id,
  name: "Original",
  url: "https://example.test",
  logo: "https://example.test/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
};

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

for (const kind of ["user", "link"] as const) {
  describe(`${kind} dialog session`, () => {
    let container: HTMLDivElement;
    let root: ReturnType<typeof createRoot>;
    let actions:
      ReturnType<typeof useUserActions> | ReturnType<typeof useLinkActions>;
    function UserHarness() {
      actions = useUserActions({
        selectedRows: [],
        onSelectionChange: vi.fn(),
        refetch: mocks.refetch,
      });
      return null;
    }
    function LinkHarness() {
      actions = useLinkActions({
        selectedRows: [],
        onSelectionChange: vi.fn(),
        refetch: mocks.refetch,
      });
      return null;
    }
    function open(recordId = id) {
      if (kind === "user")
        (actions as ReturnType<typeof useUserActions>).handleEditItem({
          ...user,
          id: recordId,
        });
      else
        (actions as ReturnType<typeof useLinkActions>).handleEditItem({
          ...link,
          id: recordId,
        });
    }
    beforeEach(async () => {
      vi.clearAllMocks();
      mocks.mutate.mockResolvedValue({});
      mocks.refetch.mockResolvedValue(undefined);
      container = document.createElement("div");
      document.body.append(container);
      root = createRoot(container);
      await act(async () =>
        root.render(
          React.createElement(kind === "user" ? UserHarness : LinkHarness),
        ),
      );
      await act(async () => open());
    });
    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });
    it.each([
      ["mutation", id],
      ["refresh", id],
      ["mutation", "000000000000000000000002"],
      ["refresh", "000000000000000000000002"],
    ] as const)(
      "keeps a reopened dialog after stale %s success for %s",
      async (stage, recordId) => {
        const pending = deferred();
        (stage === "mutation"
          ? mocks.mutate
          : mocks.refetch
        ).mockReturnValueOnce(pending.promise);
        let saving!: Promise<void>;
        await act(async () => {
          saving = actions.handleModalOk({ id, name: "Changed" });
        });
        await act(async () => actions.handleDialogOpenChange(false));
        await act(async () => open(recordId));
        await act(async () => {
          pending.resolve({});
          await saving;
        });
        expect(actions.dialogState.open).toBe(true);
        expect(actions.dialogState.record?.name).toBe("Original");
        expect(actions.dialogState.record?.id).toBe(recordId);
        expect(mocks.refetch).toHaveBeenCalledOnce();
      },
    );
    it("closes the submitting session after current success", async () => {
      await act(async () => actions.handleModalOk({ id, name: "Changed" }));
      expect(actions.dialogState.open).toBe(false);
    });
    it("keeps a reopened session on rejected mutation", async () => {
      const pending = deferred();
      mocks.mutate.mockReturnValueOnce(pending.promise);
      let saving!: Promise<void>;
      await act(async () => {
        saving = actions.handleModalOk({ id, name: "Changed" });
      });
      await act(async () => actions.handleDialogOpenChange(false));
      await act(async () => open());
      await act(async () => {
        pending.reject(new Error("failed"));
        await saving;
      });
      expect(actions.dialogState.open).toBe(true);
    });
  });
}
