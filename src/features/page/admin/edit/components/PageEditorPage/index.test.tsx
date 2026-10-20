import React, {
  act,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";
import type { PageWithRelations as PageViewModel } from "@/features/page/types";
import type { PageEditorForm } from "../PageEditorForm";
import type { PageEditorActionButtons } from "../PageEditorActionButtons";
import { AdminLayoutActionsContext } from "@/components/admin/layout-context";

type EditorDetail = Pick<
  PageViewModel,
  "id" | "title" | "content" | "status" | "template" | "version"
>;

const mocks = vi.hoisted(() => ({
  realActions: false,
  actorId: "draft-user",
  warning: vi.fn(),
  creationCheck: vi.fn(),
  searchId: null as string | null,
  queryError: null as { data?: { code: string } } | null,
  detail: undefined as EditorDetail | null | undefined,
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

vi.mock("@/features/user/admin/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: mocks.actorId, level: "ADMIN" } }),
  useCan: () => true,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(mocks.searchId ? `id=${mocks.searchId}` : ""),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error, warning: mocks.warning },
}));

vi.mock("@/lib/observability/client", () => ({
  clientLogger: { error: mocks.logger },
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    page: {
      creationResult: {
        useQuery: () => ({ data: null, refetch: mocks.creationCheck }),
      },
      adminDetail: {
        useQuery: () => ({
          data: mocks.detail,
          refetch: mocks.refetch,
          error: mocks.queryError,
        }),
      },
      create: { useMutation: () => ({ mutateAsync: mocks.create }) },
      update: { useMutation: () => ({ mutateAsync: mocks.update }) },
    },
  },
}));

vi.mock("@/components/admin/layout-context", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/admin/layout-context")
  >("@/components/admin/layout-context");
  return { ...actual, useAdminLayoutPageTitle: mocks.pageTitle };
});

vi.mock("../PageEditorForm", () => ({
  PageEditorForm: ({ form }: ComponentProps<typeof PageEditorForm>) => {
    mocks.form = form;
    return <output>{form.formState.isDirty ? "dirty" : "pristine"}</output>;
  },
}));

vi.mock("../PageEditorActionButtons", async () => {
  const actual = await vi.importActual<
    typeof import("../PageEditorActionButtons")
  >("../PageEditorActionButtons");
  return {
    PageEditorActionButtons: (
      props: ComponentProps<typeof PageEditorActionButtons>,
    ) =>
      mocks.realActions ? (
        <actual.PageEditorActionButtons {...props} />
      ) : (
        <button
          disabled={props.loading}
          onClick={() => props.onSubmit(PageStatus.PUBLISHED)}
        >
          save
        </button>
      ),
  };
});

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
  version: 0,
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
    localStorage.clear();
    mocks.searchId = null;
    mocks.queryError = null;
    mocks.detail = undefined;
    mocks.form = undefined;
    mocks.actorId = "draft-user";
    mocks.realActions = false;
    mocks.create.mockResolvedValue({ id: pageId, version: 0 });
    mocks.update.mockResolvedValue({ id: pageId, version: 1 });
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

  it.each([
    [PageStatus.DRAFT, PageStatus.PUBLISHED, "发布", "更新"],
    [PageStatus.PUBLISHED, PageStatus.DRAFT, "撤回为草稿", "保存"],
  ] as const)(
    "keeps confirmed %s -> %s status for the next real action after failed refresh",
    async (initial, expected, transition, nextAction) => {
      mocks.realActions = true;
      mocks.detail = { ...originalDetail, status: initial };
      mocks.refetch.mockRejectedValue(new Error("refresh unavailable"));
      await render();
      const clickHeader = async (label: string) => {
        const button = Array.from(
          container.querySelectorAll<HTMLButtonElement>("header button"),
        ).find((item) => item.textContent === label);
        expect(button, label).toBeDefined();
        await act(async () => button?.click());
      };
      await clickHeader(transition);
      if (initial === PageStatus.PUBLISHED) {
        const confirm = document.querySelector<HTMLButtonElement>(
          '[role="dialog"] button[data-slot="button"]',
        );
        expect(confirm).not.toBeNull();
        await act(async () => confirm?.click());
      }
      expect(mocks.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: expected, expectedVersion: 0 }),
      );
      await editTitle("next edit");
      await clickHeader(nextAction);
      expect(mocks.update).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: expected, expectedVersion: 1 }),
      );
    },
  );

  it.each([
    ["INTERNAL_SERVER_ERROR", "页面加载失败"],
    ["NOT_FOUND", "页面不存在或已被删除"],
  ])(
    "renders %s with working retry and list navigation",
    async (code, message) => {
      mocks.queryError = { data: { code } };
      await render();
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        message,
      );
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      expect(container.querySelector("header button")).toBeNull();
      expect(container.querySelector('a[href="/admin/page"]')).not.toBeNull();
      await act(async () => container.querySelector("button")?.click());
      expect(mocks.refetch).toHaveBeenCalledTimes(1);
      mocks.queryError = null;
      mocks.detail = originalDetail;
      await render();
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(requireDefined(mocks.form).getValues("title")).toEqual(
        originalDetail.title,
      );
    },
  );

  it("shows not found when the page query succeeds with null", async () => {
    mocks.detail = null;
    await render(pageId);
    expect(container.textContent).toContain("页面不存在或已被删除");
    expect(container.querySelector("[inert]")).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("restores a local draft only after explicit choice", async () => {
    mocks.detail = originalDetail;
    await render();
    await editTitle("本地草稿");
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await act(async () => root.unmount());
    root = createRoot(container);
    await render();
    expect(requireDefined(mocks.form).getValues("title.zh")).toBe("原标题");
    const restore = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "恢复草稿",
    );
    expect(restore).toBeDefined();
    await act(async () => restore?.click());
    expect(requireDefined(mocks.form).getValues("title.zh")).toBe("本地草稿");
    expect(requireDefined(mocks.form).formState.isDirty).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("configures the new-page title and initializes default values", async () => {
    await render(null);

    expect(mocks.pageTitle).toHaveBeenCalledWith("添加新页面", "new:false");
    expect(requireDefined(mocks.form).getValues()).toEqual({
      template: PageTemplate.DEFAULT,
    });
    expect(container.querySelector("output")?.textContent).toBe("pristine");
  });

  it("keeps the new-page form editable during creation and preserves it on failure", async () => {
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
    expect(pendingForm).toBeNull();
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
      expect(mocks.warning).toHaveBeenCalledWith(
        "已保存，列表待刷新，请勿重复提交",
      );
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
    expect(mocks.error).toHaveBeenCalledWith(
      "保存结果暂时无法确认，本地内容已保留，请先核对",
    );
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
  it("keeps the independent version after a dirty refetch and refreshes header closures after save", async () => {
    mocks.detail = originalDetail;
    await render();
    await editTitle("local");
    mocks.detail = { ...originalDetail, version: 7 };
    await render();
    await save();
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ expectedVersion: 0 }),
    );
    await editTitle("later");
    await save();
    expect(mocks.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ expectedVersion: 1 }),
    );
  });
  it("suppresses all old-account effects before refresh", async () => {
    mocks.detail = originalDetail;
    const pending = deferred<{ id: string; version: number }>();
    mocks.update.mockReturnValue(pending.promise);
    await render();
    await save();
    mocks.actorId = "next-user";
    await render();
    await act(async () => pending.resolve({ id: pageId, version: 1 }));
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("does not replay an unknown creation on remount and retries only its frozen input", async () => {
    await render(null);
    await act(async () => {
      requireDefined(mocks.form).setValue("title", originalDetail.title, {
        shouldDirty: true,
      });
      requireDefined(mocks.form).setValue("content", originalDetail.content, {
        shouldDirty: true,
      });
    });
    mocks.create.mockRejectedValueOnce(new Error("response lost"));
    await save();
    const frozen = mocks.create.mock.calls[0]?.[0];
    expect(frozen.creationToken).toBeTruthy();
    await editTitle("later input");
    await act(async () => root.unmount());
    root = createRoot(container);
    await render(null);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    mocks.creationCheck.mockResolvedValue({ isSuccess: true, data: null });
    mocks.create.mockResolvedValue({ id: pageId, version: 0 });
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "已核对，重试原始创建",
    );
    await act(async () => retry?.click());
    expect(mocks.create).toHaveBeenLastCalledWith(frozen);
    expect(mocks.push).toHaveBeenCalledWith(`/admin/page/edit?id=${pageId}`);
  });
  it("keeps new typing during a creation and backs it up before navigation", async () => {
    await render(null);
    await act(async () => {
      requireDefined(mocks.form).setValue("title", originalDetail.title);
      requireDefined(mocks.form).setValue("content", originalDetail.content);
    });
    const pending = deferred<{ id: string; version: number }>();
    mocks.create.mockReturnValue(pending.promise);
    await save();
    await editTitle("later creation edit");
    await act(async () => pending.resolve({ id: pageId, version: 0 }));
    const saved = JSON.parse(
      localStorage.getItem(`honeycomb:draft:page:draft-user:${pageId}`) ??
        "null",
    );
    expect(saved.values.title.zh).toBe("later creation edit");
    expect(saved.values.baseVersion).toBe(0);
    expect(mocks.push).toHaveBeenCalledTimes(1);
  });
  it("blocks creation when frozen input cannot be persisted, without clearing input", async () => {
    await render(null);
    await act(async () => {
      requireDefined(mocks.form).setValue("title", originalDetail.title);
      requireDefined(mocks.form).setValue("content", originalDetail.content);
    });
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    try {
      await save();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(requireDefined(mocks.form).getValues("title")).toEqual(
        originalDetail.title,
      );
      expect(mocks.error).toHaveBeenCalledWith(
        "无法保存创建凭据，请允许浏览器本地存储后重试",
      );
    } finally {
      storage.mockRestore();
    }
  });
  it("keeps typing during explicit latest-version review instead of replacing it", async () => {
    mocks.detail = originalDetail;
    mocks.update.mockRejectedValue({ data: { code: "CONFLICT" } });
    await render();
    await editTitle("conflicted");
    await save();
    const pending = deferred<{ isSuccess: boolean; data: EditorDetail }>();
    mocks.refetch.mockReturnValue(pending.promise);
    const reload = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "保留本地内容并加载最新版本",
    );
    await act(async () => reload?.click());
    await editTitle("typed while reviewing");
    await act(async () =>
      pending.resolve({
        isSuccess: true,
        data: { ...originalDetail, version: 6 },
      }),
    );
    expect(requireDefined(mocks.form).getValues("title.zh")).toBe(
      "typed while reviewing",
    );
    expect(mocks.warning).toHaveBeenCalledWith(
      "加载期间有新的本地编辑，未替换表单，请核对后再次加载",
    );
  });
  it("retains the submitted snapshot when an update result is unknown and typing continued", async () => {
    mocks.detail = originalDetail;
    const pending = deferred<{ id: string; version: number }>();
    mocks.update.mockReturnValue(pending.promise);
    await render();
    await editTitle("submitted snapshot");
    await save();
    await editTitle("later unsaved typing");
    await act(async () => pending.reject(new Error("lost response")));
    expect(requireDefined(mocks.form).getValues("title.zh")).toBe(
      "later unsaved typing",
    );
    const restore = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "恢复本地内容以核对",
    );
    expect(restore).toBeDefined();
    await act(async () => restore?.click());
    expect(requireDefined(mocks.form).getValues("title.zh")).toBe(
      "submitted snapshot",
    );
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation before abandoning an unknown intent and never automatically creates", async () => {
    await render(null);
    await act(async () => {
      requireDefined(mocks.form).setValue("title", originalDetail.title);
      requireDefined(mocks.form).setValue("content", originalDetail.content);
    });
    mocks.create.mockRejectedValueOnce(new Error("lost response"));
    await save();
    const restart = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "已核对列表，开始新的创建",
    );
    expect(restart).toBeDefined();
    await act(async () => restart?.click());
    const confirm = document.querySelector<HTMLButtonElement>(
      '[role="dialog"] button[data-slot="button"]',
    );
    await act(async () => confirm?.click());
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(
      localStorage.getItem("honeycomb:draft:page:draft-user:creation-attempt"),
    ).toBeNull();
    expect(requireDefined(mocks.form).getValues("title")).toEqual(
      originalDetail.title,
    );
  });
});
