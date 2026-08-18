import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  searchId: null as string | null,
  detail: undefined as Record<string, unknown> | undefined,
  refetch: vi.fn(),
  submit: vi.fn(),
  reset: vi.fn(),
  handleSubmit: vi.fn(),
  pageTitle: vi.fn(),
  layoutActions: vi.fn(),
  actionButtonsProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.searchId ? `id=${mocks.searchId}` : ""),
}));

vi.mock("react-hook-form", () => ({
  useForm: () => ({
    reset: mocks.reset,
    handleSubmit: mocks.handleSubmit,
  }),
}));

vi.mock("@/packages/ui/extended/AdminLayout", () => ({
  useAdminLayoutPageTitle: mocks.pageTitle,
  useAdminLayoutActions: (...args: unknown[]) => mocks.layoutActions(...args),
}));

vi.mock("../../queries/page-editor-query", () => ({
  usePageEditorQuery: () => ({ data: mocks.detail, refetch: mocks.refetch }),
}));

vi.mock("../../actions/page-editor-actions", () => ({
  usePageEditorActions: () => ({ loading: false, submit: mocks.submit }),
}));

vi.mock("../PageEditorForm", () => ({
  PageEditorForm: (props: { form: unknown }) => <div data-form={!!props.form} />,
}));

vi.mock("../PageEditorActionButtons", () => ({
  PageEditorActionButtons: (props: Record<string, unknown>) => {
    mocks.actionButtonsProps = props;
    return <div>actions</div>;
  },
}));

import { PageEditorPage } from ".";

describe("PageEditorPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.searchId = null;
    mocks.detail = undefined;
    mocks.refetch.mockClear();
    mocks.submit.mockClear();
    mocks.reset.mockClear();
    mocks.handleSubmit.mockReset();
    mocks.pageTitle.mockClear();
    mocks.layoutActions.mockClear();
    mocks.actionButtonsProps = undefined;
  });

  function render() {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<PageEditorPage />));
  }

  it("configures the new-page title and resets the default form", () => {
    render();

    expect(mocks.pageTitle).toHaveBeenCalledWith(
      "添加新页面",
      "new:false",
    );
    expect(mocks.reset).toHaveBeenCalledWith({ template: "default" });
  });

  it("maps detail state to edit controls and forwards a submit status", () => {
    mocks.searchId = "page-1";
    mocks.detail = {
      id: "page-1",
      title: { zh: "标题" },
      content: { zh: "内容" },
      status: "PUBLISHED",
      template: "DEFAULT",
    };
    mocks.handleSubmit.mockImplementation(
      (callback: (values: Record<string, unknown>) => void) => () =>
        callback({ title: { zh: "更新" } }),
    );
    render();

    expect(mocks.pageTitle).toHaveBeenCalledWith(
      "修改页面",
      "page-1:false",
    );
    expect(mocks.reset).toHaveBeenCalledWith({
      title: { zh: "标题" },
      content: { zh: "内容" },
      status: "PUBLISHED",
      template: "DEFAULT",
    });

    const headerActions = mocks.layoutActions.mock.calls[0]?.[0] as React.ReactElement;
    const actionButtonsProps = (headerActions.props as { children: React.ReactElement })
      .children.props as { onSubmit: (status: string) => void };

    act(() => actionButtonsProps.onSubmit("DRAFT"));

    expect(mocks.submit).toHaveBeenCalledWith(
      { title: { zh: "更新" } },
      "DRAFT",
    );
  });
});
