import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { MenuType } from "../menu-types";
import { useMenuActions } from "./menu-actions";
import { useMenuTreeEditor } from "./use-menu-tree-editor";
import type { CheckedMenuData } from "./menu-transforms";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    menu: { saveAll: { useMutation: () => ({ mutateAsync: mocks.save }) } },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));
const row = {
  id: "111111111111111111111111",
  type: MenuType.CUSTOM,
  power: 0,
  parent: null,
  createdAt: null,
  updatedAt: null,
};
const second = { ...row, id: "222222222222222222222222", power: 1 };

describe("menu editor save lifecycle", () => {
  it.each(["committed", "unknown"])(
    "protects a reverted baseline while %s and requires review for unknown",
    async (outcome) => {
      Object.values(mocks).forEach((mock) => mock.mockReset());
      const root = createRoot(document.createElement("div"));
      let editor: ReturnType<typeof useMenuTreeEditor> | undefined;
      let actions: ReturnType<typeof useMenuActions> | undefined;
      const current = () => {
        if (!editor || !actions) throw new Error("not mounted");
        return { editor, actions };
      };
      function Probe({ remote }: { remote: CheckedMenuData }) {
        editor = useMenuTreeEditor(remote);
        actions = useMenuActions(
          editor.checkedList,
          editor.baseVersion,
          mocks.refresh,
          editor.acknowledge,
          editor.setProtected,
        );
        return null;
      }
      let finish: ((value: unknown) => void) | undefined;
      let fail: ((error: Error) => void) | undefined;
      mocks.save.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            finish = resolve;
            fail = reject;
          }),
      );
      mocks.refresh.mockResolvedValue({ isSuccess: true });
      try {
        await act(async () =>
          root.render(<Probe remote={{ list: [row], version: 0 }} />),
        );
        await act(async () =>
          current().editor.onCheck(second, true, MenuType.CUSTOM),
        );
        let pending: Promise<void> | undefined;
        await act(async () => {
          pending = current().actions.submit();
        });
        await act(async () =>
          current().editor.onCheck(second, false, MenuType.CUSTOM),
        );
        await act(async () =>
          root.render(<Probe remote={{ list: [row, second], version: 1 }} />),
        );
        expect(current().editor.checkedList).toEqual([row]);
        await act(async () => {
          if (outcome === "committed")
            finish?.({ count: 2, version: 1, publicSync: "completed" });
          else fail?.(new Error("response lost"));
          await pending;
        });
        expect(current().editor.checkedList).toEqual([row]);
        if (outcome === "committed") expect(current().editor.dirty).toBe(true);
        else {
          expect(current().actions.blocked).toBe(true);
          await act(async () =>
            root.render(<Probe remote={{ list: [row, second], version: 1 }} />),
          );
          expect(current().editor.checkedList).toEqual([row]);
          await act(async () => current().actions.submit());
          expect(mocks.save).toHaveBeenCalledOnce();
        }
      } finally {
        await act(async () => root.unmount());
      }
    },
  );
});
