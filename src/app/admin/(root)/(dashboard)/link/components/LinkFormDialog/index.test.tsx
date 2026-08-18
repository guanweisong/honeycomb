import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  formProps: undefined as
    | {
        defaultValues?: Record<string, unknown>;
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

import { ModalType } from "@/app/admin/types/modal-type";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { LinkFormDialog } from ".";

describe("LinkFormDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.formProps = undefined;
  });

  function render(
    state: { type: ModalType; open: boolean; record?: Record<string, unknown> },
    onSubmit = vi.fn(),
  ) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <LinkFormDialog
          state={state as never}
          onOpenChange={vi.fn()}
          onSubmit={onSubmit}
        />,
      ),
    );
    return onSubmit;
  }

  it("does not render a form while closed", () => {
    render({ type: ModalType.ADD, open: false });

    expect(container.textContent).toBe("");
    expect(mocks.formProps).toBeUndefined();
  });

  it("uses enabled status as the default for a new link", () => {
    render({ type: ModalType.ADD, open: true });

    expect(mocks.formProps?.defaultValues).toEqual({
      status: EnableStatus.ENABLE,
    });
  });

  it("maps an existing link and forwards submitted values", () => {
    const onSubmit = render(
      {
        type: ModalType.EDIT,
        open: true,
        record: {
          id: "link-1",
          name: "Honeycomb",
          url: "https://example.test",
          logo: "https://example.test/logo.png",
          description: "A link",
          status: EnableStatus.DISABLE,
        },
      },
    );
    const values = { name: "Updated", url: "https://updated.test" };

    expect(mocks.formProps?.defaultValues).toMatchObject({
      id: "link-1",
      name: "Honeycomb",
      status: EnableStatus.DISABLE,
    });

    act(() => mocks.formProps?.onSubmit(values));

    expect(onSubmit).toHaveBeenCalledWith(values);
  });
});
