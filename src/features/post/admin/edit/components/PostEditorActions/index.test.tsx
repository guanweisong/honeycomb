import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const grantedPermissions = new Set<string>();

vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: (permission: string) => grantedPermissions.has(permission),
}));

vi.mock("@/packages/ui/components/button", () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    void _variant,
    React.createElement("button", props, children)
  ),
}));

vi.mock("@/packages/ui/extended/Dialog", () => ({
  Dialog: ({ onOK, trigger }: { onOK: () => void; trigger: React.ReactNode }) =>
    React.createElement(
      React.Fragment,
      null,
      trigger,
      React.createElement("button", { onClick: onOK }, "确认撤回"),
    ),
}));

import { PostEditorActions } from "./index";

describe("PostEditorActions", () => {
  let container: HTMLDivElement;
  let root: Root;
  let submitted: unknown[][];

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
    id?: string;
    loading?: boolean;
    status?: string;
  }) {
    await act(async () => {
      root.render(
        React.createElement(PostEditorActions, {
          ...props,
          loading: props.loading ?? false,
          submit: async (...args) => {
            submitted.push(args);
          },
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
      await Promise.resolve();
    });
  }

  it("renders no mutations when the user has no write permission", async () => {
    await renderActions({ id: "post-1", status: "PUBLISHED" });

    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("offers publish and draft creation to post creators", async () => {
    grantedPermissions.add("post:create");
    await renderActions({});

    expect(container.textContent).toContain("发布");
    expect(container.textContent).toContain("保存草稿");
    await click("发布");
    await click("保存草稿");
    expect(submitted).toEqual([
      ["PUBLISHED", "create"],
      ["DRAFT", "create"],
    ]);
  });

  it("offers update and withdrawal for a published post", async () => {
    grantedPermissions.add("post:update");
    await renderActions({ id: "post-1", status: "PUBLISHED" });

    await click("更新");
    await click("确认撤回");
    expect(submitted).toEqual([
      ["PUBLISHED", "update"],
      ["DRAFT", "update"],
    ]);
  });

  it("offers save and publish for a draft post", async () => {
    grantedPermissions.add("post:update");
    await renderActions({ id: "post-1", status: "DRAFT" });

    await click("保存");
    await click("发布");
    expect(submitted).toEqual([
      ["DRAFT", "update"],
      ["PUBLISHED", "update"],
    ]);
  });

  it("disables published-post actions while a mutation is pending", async () => {
    grantedPermissions.add("post:update");
    await renderActions({ id: "post-1", loading: true, status: "PUBLISHED" });

    expect(button("更新")?.disabled).toBe(true);
    expect(button("撤回为草稿")?.disabled).toBe(true);
  });
});
