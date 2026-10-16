import React, {
  act,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import type { PageViewModel } from "@/features/page/presentation/page-view-model";
import type { PageEditorForm } from "../PageEditorForm";
import type { PageEditorActionButtons } from "../PageEditorActionButtons";
import { AdminLayoutActionsContext } from "@/packages/ui/extended/AdminLayout/AdminLayoutContext";

type EditorDetail = Pick<
  PageViewModel,
  "id" | "title" | "content" | "status" | "template"
>;

const mocks = vi.hoisted(() => ({
  searchId: null as string | null,
  detail: undefined as EditorDetail | undefined,
  form: undefined as ComponentProps<typeof PageEditorForm>["form"] | undefined,
  refetch: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  logger: vi.fn(),
  pageTitle: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(mocks.searchId ? `id=${mocks.searchId}` : ""),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

vi.mock("@/packages/infrastructure/observability/client", () => ({
  clientLogger: { error: mocks.logger },
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    page: {
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));

vi.mock("@/packages/ui/extended/AdminLayout", async () => {
  const { useAdminLayoutActions } =
    await import("@/packages/ui/extended/AdminLayout/AdminLayoutContext");
  return { useAdminLayoutPageTitle: mocks.pageTitle, useAdminLayoutActions };
});

vi.mock("../../queries/page-editor-query", () => ({
  usePageEditorQuery: () => ({ data: mocks.detail, refetch: mocks.refetch }),
}));

vi.mock("../PageEditorForm", () => ({
  PageEditorForm: ({ form }: ComponentProps<typeof PageEditorForm>) => {
    mocks.form = form;
    return <output>{form.formState.isDirty ? "dirty" : "pristine"}</output>;
  },
}));

vi.mock("../PageEditorActionButtons", () => ({
  PageEditorActionButtons: ({
    onSubmit,
    loading,
  }: ComponentProps<typeof PageEditorActionButtons>) => (
    <button disabled={loading} onClick={() => onSubmit(PageStatus.PUBLISHED)}>
      save
    </button>
  ),
}));

import { PageEditorPage } from ".";

function LayoutHarness() {
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <AdminLayoutActionsContext.Provider value={{ setActions }}>
      <header>{actions}</header>
      <PageEditorPage />
    </AdminLayoutActionsContext.Provider>
  );
}

const pageId = "123456789012345678901234";
const originalDetail = {
  id: pageId,
  title: { zh: "原标题", en: "Original title" },
  content: { zh: "原内容", en: "Original content" },
  status: PageStatus.DRAFT,
  template: PageTemplate.DEFAULT,
} satisfies EditorDetail;

function deferred<T>() {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason: Error) => void) | undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve: (value: T) => requireDefined(resolve)(value),
    reject: (reason: Error) => requireDefined(reject)(reason),
  };
}

describe("PageEditorPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.searchId = null;
    mocks.detail = undefined;
    mocks.form = undefined;
    mocks.create.mockResolvedValue({ id: pageId });
    mocks.update.mockResolvedValue({ id: pageId });
    mocks.refetch.mockResolvedValue({ isSuccess: false });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function render(id: string | null = pageId) {
    mocks.searchId = id;
    await act(async () => root.render(<LayoutHarness />));
  }

  async function editTitle(zh = "未保存标题") {
    await act(async () => {
      requireDefined(mocks.form).setValue(
        "title",
        { zh, en: "Edited title" },
        { shouldDirty: true },
      );
    });
  }

  async function save() {
    await act(async () => container.querySelector("button")?.click());
  }

  it("configures the new-page title and initializes default values", async () => {
    await render(null);

    expect(mocks.pageTitle).toHaveBeenCalledWith("添加新页面", "new:false");
    expect(requireDefined(mocks.form).getValues()).toEqual({
      template: PageTemplate.DEFAULT,
    });
    expect(container.querySelector("output")?.textContent).toBe("pristine");
  });

  it("makes the new-page form inert during creation and releases it on failure", async () => {
    const create = deferred<{ id: string }>();
    mocks.create.mockReturnValue(create.promise);
    await render(null);
    await act(async () => {
      requireDefined(mocks.form).setValue("title", originalDetail.title);
      requireDefined(mocks.form).setValue("content", originalDetail.content);
    });
    expect(container.querySelector("[inert]")).toBeNull();

    await save();

    const pendingForm = container.querySelector("[inert][aria-busy='true']");
    expect(pendingForm?.contains(container.querySelector("output"))).toBe(true);
    await act(async () => create.reject(new Error("create unavailable")));

    expect(container.querySelector("[inert]")).toBeNull();
    expect(container.querySelector("[aria-busy='true']")).toBeNull();
    expect(requireDefined(mocks.form).getValues("title")).toEqual(
      originalDetail.title,
    );
  });

  it("keeps existing-page forms interactive while an update is pending", async () => {
    mocks.detail = originalDetail;
    const update = deferred<{ id: string }>();
    mocks.update.mockReturnValue(update.promise);
    await render();
    await save();

    expect(container.querySelector("[inert]")).toBeNull();
    expect(container.querySelector("[aria-busy='true']")).toBeNull();
    await editTitle("保存期间继续编辑");
    await act(async () => update.resolve({ id: pageId }));

    expect(requireDefined(mocks.form).getValues("title")?.zh).toBe(
      "保存期间继续编辑",
    );
    expect(requireDefined(mocks.form).formState.isDirty).toBe(true);
  });

  it("hydrates detail when the initial request finishes", async () => {
    await render();
    expect(container.querySelector("[inert][aria-busy='true']")).not.toBeNull();
    const action = requireDefined(container.querySelector("header button"));
    expect(action.closest("[inert]")).toBeNull();
    expect(action.hasAttribute("disabled")).toBe(true);
    await save();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.detail = originalDetail;
    await render();

    expect(container.querySelector("[inert]")).toBeNull();
    expect(
      container.querySelector("header button")?.hasAttribute("disabled"),
    ).toBe(false);
    expect(mocks.pageTitle).toHaveBeenCalledWith("修改页面", `${pageId}:false`);
    expect(requireDefined(mocks.form).getValues()).toEqual({
      title: originalDetail.title,
      content: originalDetail.content,
      status: PageStatus.DRAFT,
      template: PageTemplate.DEFAULT,
    });
    expect(requireDefined(mocks.form).formState.isDirty).toBe(false);
  });

  it("preserves dirty title, content, and template during same-page refetch", async () => {
    mocks.detail = originalDetail;
    await render();
    await editTitle();
    await act(async () => {
      const form = requireDefined(mocks.form);
      form.setValue(
        "content",
        { zh: "未保存内容", en: "Edited content" },
        { shouldDirty: true },
      );
      form.setValue("template", PageTemplate.FRIENDLY_LINKS, {
        shouldDirty: true,
      });
    });
    mocks.detail = {
      ...originalDetail,
      title: { zh: "后台标题", en: "Server" },
    };
    await render();

    const form = requireDefined(mocks.form);
    expect(form.getValues("title")).toEqual({
      zh: "未保存标题",
      en: "Edited title",
    });
    expect(form.getValues("content")).toEqual({
      zh: "未保存内容",
      en: "Edited content",
    });
    expect(form.getValues("template")).toBe(PageTemplate.FRIENDLY_LINKS);
    expect(form.formState.isDirty).toBe(true);
  });

  it("refreshes a pristine form from newer detail", async () => {
    mocks.detail = originalDetail;
    await render();
    mocks.detail = { ...originalDetail, title: { zh: "新标题", en: "New" } };
    await render();

    const form = requireDefined(mocks.form);
    expect(form.getValues("title")).toEqual(mocks.detail.title);
    expect(form.formState.isDirty).toBe(false);
  });

  it.each([null, "234567890123456789012345"])(
    "clears an old draft when navigating to %s before its detail arrives",
    async (nextId) => {
      mocks.detail = originalDetail;
      await render();
      await editTitle();
      // The old query snapshot may remain visible during the route transition.
      await render(nextId);

      expect(requireDefined(mocks.form).getValues()).toEqual({
        template: PageTemplate.DEFAULT,
      });
      expect(requireDefined(mocks.form).formState.isDirty).toBe(false);

      if (nextId) {
        mocks.detail = {
          ...originalDetail,
          id: nextId,
          title: { zh: "新页面", en: "Next page" },
        };
        await render(nextId);
        expect(requireDefined(mocks.form).getValues("title")).toEqual(
          mocks.detail.title,
        );
      }
    },
  );

  it("replaces the old draft when navigating to an already-loaded page", async () => {
    mocks.detail = originalDetail;
    await render();
    await editTitle();
    const nextId = "234567890123456789012345";
    mocks.detail = { ...originalDetail, id: nextId };
    await render(nextId);

    expect(requireDefined(mocks.form).getValues("title")).toEqual(
      originalDetail.title,
    );
    expect(requireDefined(mocks.form).formState.isDirty).toBe(false);
  });

  it.each(["cached error", "rejection"])(
    "marks saved values pristine even when refetch ends in %s",
    async (failure) => {
      mocks.detail = originalDetail;
      await render();
      await editTitle("保存标题");
      if (failure === "rejection") {
        mocks.refetch.mockRejectedValue(new Error("refetch unavailable"));
      } else {
        mocks.refetch.mockResolvedValue({
          data: originalDetail,
          isSuccess: false,
          isError: true,
        });
      }
      await save();
      await render();

      const form = requireDefined(mocks.form);
      expect(form.getValues("title")).toEqual({
        zh: "保存标题",
        en: "Edited title",
      });
      expect(form.getValues("status")).toBe(PageStatus.PUBLISHED);
      expect(form.formState.isDirty).toBe(false);
      expect(mocks.success).toHaveBeenCalledWith("更新成功");
      expect(mocks.error).not.toHaveBeenCalled();
    },
  );

  it("keeps edits made while saving and compares them against the saved baseline", async () => {
    mocks.detail = originalDetail;
    const update = deferred<{ id: string }>();
    mocks.update.mockReturnValue(update.promise);
    await render();
    await editTitle("提交标题");
    await save();
    await editTitle("保存期间继续编辑");
    const savedDetail = {
      ...originalDetail,
      title: { zh: "提交标题", en: "Edited title" },
      status: PageStatus.PUBLISHED,
    };
    mocks.refetch.mockImplementation(async () => {
      mocks.detail = savedDetail;
      return { data: savedDetail, isSuccess: true };
    });
    await act(async () => update.resolve({ id: pageId }));
    await render();

    const form = requireDefined(mocks.form);
    expect(form.getValues("title")).toEqual({
      zh: "保存期间继续编辑",
      en: "Edited title",
    });
    expect(form.formState.isDirty).toBe(true);
    expect(form.formState.defaultValues?.title).toEqual(savedDetail.title);

    await editTitle("提交标题");
    expect(requireDefined(mocks.form).formState.isDirty).toBe(false);
  });

  it("keeps the draft dirty when saving fails", async () => {
    mocks.detail = originalDetail;
    mocks.update.mockRejectedValue(new Error("save unavailable"));
    await render();
    await editTitle();
    await save();

    expect(requireDefined(mocks.form).getValues("title")?.zh).toBe(
      "未保存标题",
    );
    expect(requireDefined(mocks.form).formState.isDirty).toBe(true);
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith("提交失败，请检查表单内容");
  });

  it("does not reset the next page when an earlier save finishes", async () => {
    mocks.detail = originalDetail;
    const update = deferred<{ id: string }>();
    mocks.update.mockReturnValue(update.promise);
    await render();
    await editTitle();
    await save();
    const nextId = "234567890123456789012345";
    mocks.detail = { ...originalDetail, id: nextId };
    await render(nextId);
    await editTitle("下一页未保存标题");
    await act(async () => update.resolve({ id: pageId }));

    expect(requireDefined(mocks.form).getValues("title")?.zh).toBe(
      "下一页未保存标题",
    );
    expect(requireDefined(mocks.form).formState.isDirty).toBe(true);
  });
});
