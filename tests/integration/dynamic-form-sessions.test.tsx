import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ModalType } from "@/components/admin/modal-type";
import { EnableStatus } from "@/lib/validation/enable-status";
import { UserLevel, UserStatus } from "@/features/user/user";
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
    let container: HTMLDivElement;
    let root: Root;
    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });
    afterEach(async () => {
      await act(async () => root.unmount());
      container.remove();
    });
    function input() {
      const field = container.querySelector<HTMLInputElement>(
        `input[name="${inputName}"]`,
      );
      if (!field) throw new Error(`Missing ${inputName} field`);
      return field;
    }
    async function render(element: ReactNode) {
      await act(async () => root.render(element));
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
      await render(renderEdit("record-1", "Initial"));
      await edit();
      await render(renderEdit("record-1", "Refetched"));
      expect(input().value).toBe("Draft");
    });

    it("initializes a different record instead of leaking the previous draft", async () => {
      await render(renderEdit("record-1", "Initial"));
      await edit();
      await render(renderEdit("record-2", "Another record"));
      expect(input().value).toBe("Another record");
    });

    it("starts a clean create session after editing a record", async () => {
      await render(renderEdit("record-1", "Initial"));
      await edit();
      await render(renderCreate());
      expect(input().value).toBe("");
    });

    it("starts fresh when the same record is closed and reopened", async () => {
      await render(renderEdit("record-1", "Initial"));
      await edit();
      await render(renderEdit("record-1", "Initial", false));
      expect(container.querySelector("input")).toBeNull();
      await render(renderEdit("record-1", "Initial"));
      expect(input().value).toBe("Initial");
    });
  },
);
