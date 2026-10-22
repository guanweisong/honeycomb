import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ModalType } from "@/components/admin/types/modal-type";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import type { UserRecord } from "@/features/user/types/user.record";
import { UserUpdateSchema } from "@/features/user/schemas/user.write.schema";
import { submitUserUpdate } from "../../user-actions";
import { UserFormDialog } from ".";

vi.mock("@/components/Dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

it("submits the real form without treating normalization of a legacy name as a rename", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const record: UserRecord = {
    id: "000000000000000000000001",
    name: " Legacy ",
    email: "legacy@example.test",
    level: UserLevel.EDITOR,
    status: UserStatus.ENABLE,
    createdAt: null,
    updatedAt: null,
  };
  const update = vi.fn().mockResolvedValue(record);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <UserFormDialog
          state={{ type: ModalType.EDIT, open: true, record }}
          onOpenChange={vi.fn()}
          onSubmit={async (values) => {
            await submitUserUpdate({
              record,
              values: UserUpdateSchema.parse(values),
              update,
              refetch: vi.fn(),
              notifySuccess: vi.fn(),
              notifyError: vi.fn(),
            });
          }}
        />,
      ),
    );
    await act(async () => {
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("name");
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      id: record.id,
      email: record.email,
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
