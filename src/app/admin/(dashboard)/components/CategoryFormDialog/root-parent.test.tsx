import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { EnableStatus } from "@/lib/validation/enable-status";
import { ModalType } from "@/app/admin/(dashboard)/types/modal-type";
import type { CategoryListItem } from "@/features/category/types/category.record";
import { requireDefined } from "@tests/helpers/require-defined";

const mocks = vi.hoisted(() => ({
  update: vi.fn().mockResolvedValue({}),
  close: vi.fn(),
}));
const category: CategoryListItem = {
  id: "507f1f77bcf86cd799439011",
  title: { zh: "子分类", en: "Child" },
  description: { zh: "说明", en: "Description" },
  path: "child",
  parent: "parent-1",
  status: EnableStatus.ENABLE,
  createdAt: null,
  updatedAt: null,
  deepPath: 1,
};
const query = { data: { list: [category] }, refetch: vi.fn() };
vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    category: {
      adminTree: { useQuery: () => query },
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));
vi.mock("@/components/Dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
// Replace only the portal-backed primitive; retain the real form, resolver and field binding.
vi.mock("@/components/Select", () => ({
  Select: (props: {
    value?: string;
    onChange?: (value: string) => void;
    options?: { value: string; label: React.ReactNode }[];
  }) => (
    <select
      aria-label="父级分类"
      value={props.value}
      onChange={(event) => props.onChange?.(event.target.value)}
    >
      {props.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));
import CategoryFormDialog from ".";
let root: Root;
let container: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it("moves an existing child to the explicit root through the actual form", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <CategoryFormDialog
        modalProps={{ type: ModalType.EDIT, open: true, record: category }}
        setModalProps={mocks.close}
      />,
    ),
  );
  const select = requireDefined(container.querySelector("select"));
  expect(
    Array.from(select.options).some(
      (option) => option.value === "0" && option.textContent === "根分类",
    ),
  ).toBe(true);
  await act(async () => {
    select.value = "0";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () =>
    requireDefined(container.querySelector("form")).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ id: category.id, parent: null }),
  );
  expect(mocks.close).toHaveBeenCalledWith({ open: false });
});
