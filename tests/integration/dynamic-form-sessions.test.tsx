import React, { act, type ReactNode } from "react";
import {
  cleanup,
  render as renderView,
  type RenderResult,
} from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { ModalType } from "@/components/admin/types/modal-type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { LinkFormDialog } from "@/features/link/admin/components/LinkFormDialog";
import { UserFormDialog } from "@/features/user/admin/components/UserFormDialog";
import TagFormDialog from "@/features/tag/admin/components/TagFormDialog";
import CategoryFormDialog from "@/features/category/admin/components/CategoryFormDialog";

const mocks = vi.hoisted(() => ({
  categoryQuery: { data: { list: [] }, refetch: vi.fn() },
  mutate: vi.fn().mockResolvedValue(undefined),
}));

// Keep the real form and controls; only omit the dialog portal/animation boundary.
vi.mock("@/components/Dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
}));
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    tag: {
      create: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
      update: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
    },
    category: {
      adminTree: { useQuery: () => mocks.categoryQuery },
      create: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
      update: { useMutation: () => ({ mutateAsync: mocks.mutate }) },
    },
  },
}));

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
afterAll(() => vi.unstubAllGlobals());

const dialogs: Array<{
  name: string;
  inputName: string;
  renderEdit: (id: string, title: string, open?: boolean) => ReactNode;
  renderCreate: () => ReactNode;
}> = [
  {
    name: "link",
    inputName: "name",
    renderEdit: (id, title, open = true) => (
      <LinkFormDialog
        state={{
          type: ModalType.EDIT,
          open,
          record: {
            id,
            name: title,
            url: "https://example.test",
            logo: "https://example.test/logo.png",
            description: "Description",
            status: EnableStatus.ENABLE,
            createdAt: null,
            updatedAt: null,
          },
        }}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    ),
    renderCreate: () => (
      <LinkFormDialog
        state={{ type: ModalType.ADD, open: true }}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    ),
  },
  {
    name: "user",
    inputName: "name",
    renderEdit: (id, title, open = true) => (
      <UserFormDialog
        state={{
          type: ModalType.EDIT,
          open,
          record: {
            id,
            name: title,
            email: "user@example.test",
            level: UserLevel.GUEST,
            status: UserStatus.ENABLE,
            createdAt: null,
            updatedAt: null,
          },
        }}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    ),
    renderCreate: () => (
      <UserFormDialog
        state={{ type: ModalType.ADD, open: true }}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    ),
  },
  {
    name: "tag",
    inputName: "name.zh",
    renderEdit: (id, title, open = true) => (
      <TagFormDialog
        type={ModalType.EDIT}
        open={open}
        record={{
          id,
          name: { zh: title, en: "English" },
          createdAt: null,
          updatedAt: null,
        }}
      />
    ),
    renderCreate: () => <TagFormDialog type={ModalType.ADD} open />,
  },
  {
    name: "category",
    inputName: "title.zh",
    renderEdit: (id, title, open = true) => (
      <CategoryFormDialog
        modalProps={{
          type: ModalType.EDIT,
          open,
          record: {
            id,
            title: { zh: title, en: "English" },
            description: null,
            path: "category",
            parent: null,
            status: EnableStatus.ENABLE,
            createdAt: null,
            updatedAt: null,
            deepPath: 0,
          },
        }}
        setModalProps={vi.fn()}
      />
    ),
    renderCreate: () => (
      <CategoryFormDialog
        modalProps={{ type: ModalType.ADD, open: true }}
        setModalProps={vi.fn()}
      />
    ),
  },
];

describe.each(dialogs)(
  "$name form sessions",
  ({ inputName, renderEdit, renderCreate }) => {
    let view: RenderResult | undefined;
    afterEach(() => {
      cleanup();
      view = undefined;
    });
    function input() {
      const field = view?.container.querySelector<HTMLInputElement>(
        `input[name="${inputName}"]`,
      );
      if (!field) throw new Error(`Missing ${inputName} field`);
      return field;
    }
    function render(element: ReactNode) {
      if (view) view.rerender(element);
      else view = renderView(element);
    }
    async function edit() {
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set?.call(input(), "Draft");
        input().dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    it("preserves edits when the same record is refetched", async () => {
      render(renderEdit("record-1", "Initial"));
      await edit();
      render(renderEdit("record-1", "Refetched"));
      expect(input().value).toBe("Draft");
    });

    it("initializes a different record instead of leaking the previous draft", async () => {
      render(renderEdit("record-1", "Initial"));
      await edit();
      render(renderEdit("record-2", "Another record"));
      expect(input().value).toBe("Another record");
    });

    it("starts a clean create session after editing a record", async () => {
      render(renderEdit("record-1", "Initial"));
      await edit();
      render(renderCreate());
      expect(input().value).toBe("");
    });

    it("starts fresh when the same record is closed and reopened", async () => {
      render(renderEdit("record-1", "Initial"));
      await edit();
      render(renderEdit("record-1", "Initial", false));
      expect(view?.container.querySelector("input")).toBeNull();
      render(renderEdit("record-1", "Initial"));
      expect(input().value).toBe("Initial");
    });
  },
);
