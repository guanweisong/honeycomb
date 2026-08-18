import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const grantedPermissions = new Set<string>();

vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: (permission: string) => grantedPermissions.has(permission),
}));

vi.mock("@/packages/ui/components/button", () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) =>
    (void _variant, React.createElement("button", props, children)),
}));

vi.mock("@/packages/ui/extended/Dialog", () => ({
  Dialog: ({
    onOK,
    trigger,
  }: {
    onOK: () => void;
    trigger: React.ReactNode;
  }) =>
    React.createElement(
      React.Fragment,
      null,
      trigger,
      React.createElement("button", { onClick: onOK }, "确认撤回"),
    ),
}));

import { PageEditorActionButtons } from "./index";

describe("PageEditorActionButtons", () => {
  let container: HTMLDivElement;
  let root: Root;
  let submitted: string[];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    grantedPermissions.clear();
    submitted = [];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderActions(props: {
    isEdit: boolean;
    loading?: boolean;
    status?: string;
  }) {
    await act(async () => {
      root.render(
        React.createElement(PageEditorActionButtons, {
          ...props,
          loading: props.loading ?? false,
          onSubmit: (status) => submitted.push(status),
        }),
      );
    });
  }

  function button(text: string) {
    return Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === text,
    );
  }

  async function click(text: string) {
    await act(async () => {
      button(text)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  it("renders no mutations without page write permission", async () => {
    await renderActions({ isEdit: true, status: "PUBLISHED" });

    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("allows page creators to publish or save a draft", async () => {
    grantedPermissions.add("page:create");
    await renderActions({ isEdit: false });

    await click("发布");
    await click("保存草稿");
    expect(submitted).toEqual(["PUBLISHED", "DRAFT"]);
  });

  it("allows published pages to be updated or withdrawn", async () => {
    grantedPermissions.add("page:update");
    await renderActions({ isEdit: true, status: "PUBLISHED" });

    await click("更新");
    await click("确认撤回");
    expect(submitted).toEqual(["PUBLISHED", "DRAFT"]);
  });

  it("allows draft pages to be saved or published", async () => {
    grantedPermissions.add("page:update");
    await renderActions({ isEdit: true, status: "DRAFT" });

    await click("保存");
    await click("发布");
    expect(submitted).toEqual(["DRAFT", "PUBLISHED"]);
  });

  it("disables update controls while a mutation is pending", async () => {
    grantedPermissions.add("page:update");
    await renderActions({ isEdit: true, loading: true, status: "PUBLISHED" });

    expect(button("更新")?.disabled).toBe(true);
    expect(button("撤回为草稿")?.disabled).toBe(true);
  });
});
