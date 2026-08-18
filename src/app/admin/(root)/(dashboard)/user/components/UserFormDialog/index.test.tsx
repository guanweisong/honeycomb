import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  formProps: undefined as
    | {
        defaultValues?: Record<string, unknown>;
        fields: Array<{ name: string; disabled?: () => boolean }>;
        onSubmit: (values: Record<string, unknown>) => void;
      }
    | undefined,
}));

vi.mock("@/packages/ui/extended/Dialog", () => ({
  Dialog: (props: { children: React.ReactNode }) => <div>{props.children}</div>,
}));

vi.mock("@/packages/ui/extended/DynamicForm", () => ({
  DynamicForm: (props: typeof mocks.formProps) => {
    mocks.formProps = props as NonNullable<typeof mocks.formProps>;
    return <div>dynamic-form</div>;
  },
}));

import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { ModalType } from "@/app/admin/types/modal-type";
import { UserFormDialog } from ".";

describe("UserFormDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.formProps = undefined;
  });

  function render(
    state: {
      type: ModalType;
      open: boolean;
      record?: Record<string, unknown>;
    },
    onSubmit = vi.fn(),
  ) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <UserFormDialog
          state={state as never}
          onOpenChange={vi.fn()}
          onSubmit={onSubmit}
        />,
      ),
    );
    return onSubmit;
  }

  it("uses guest and enabled defaults for a new user", () => {
    render({ type: ModalType.ADD, open: true });

    expect(mocks.formProps?.defaultValues).toEqual({
      status: UserStatus.ENABLE,
      level: UserLevel.GUEST,
    });
    expect(mocks.formProps?.fields.every((field) => !field.disabled?.())).toBe(
      true,
    );
  });

  it("maps an existing user to edit defaults and protects admin controls", () => {
    render({
      type: ModalType.EDIT,
      open: true,
      record: {
        id: "user-1",
        name: "Admin",
        email: "admin@example.test",
        level: UserLevel.ADMIN,
        status: UserStatus.ENABLE,
      },
    });

    expect(mocks.formProps?.defaultValues).toMatchObject({
      id: "user-1",
      name: "Admin",
      level: UserLevel.ADMIN,
    });
    expect(
      mocks.formProps?.fields
        .filter((field) => field.name === "level" || field.name === "status")
        .every((field) => field.disabled?.()),
    ).toBe(true);
  });

  it("forwards form submissions to the parent handler", () => {
    const onSubmit = render({ type: ModalType.ADD, open: true });
    const values = { name: "Editor", level: UserLevel.EDITOR };

    act(() => mocks.formProps?.onSubmit(values));

    expect(onSubmit).toHaveBeenCalledWith(values);
  });
});
