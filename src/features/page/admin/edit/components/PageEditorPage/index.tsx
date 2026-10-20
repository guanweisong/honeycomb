"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { PageInsertSchema, type PageInsert } from "@/features/page/schema";
import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";
import {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "@/components/admin/layout-context";
import { EditorLoadError } from "@/components/admin/editor-load-error";
import { PageEditorActionButtons } from "../PageEditorActionButtons";
import { PageEditorForm } from "../PageEditorForm";
import { usePageEditorActions } from "../../page-editor-actions";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  getPageEditorId,
  toPageEditorFormValues,
} from "../../transforms/page-editor-transforms";

import {
  useLocalDraft,
  LocalDraftPrompt,
} from "@/components/admin/local-draft";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { can, Permission } from "@/lib/auth/permissions";
import { parsePageDraft } from "../../transforms/page-draft";

export function PageEditorPage() {
  const id = getPageEditorId(useSearchParams());
  const form = useForm<PageInsert>({
    resolver: zodResolver(PageInsertSchema),
    defaultValues: { template: PageTemplate.DEFAULT },
  });
  const query = trpc.page.adminDetail.useQuery(
    { id: id ?? "" },
    { enabled: !!id },
  );
  const detail = query.data;
  const actions = usePageEditorActions({
    pageId: detail?.id,
    refetch: query.refetch,
  });
  const isLoadingDetail = Boolean(id && detail?.id !== id);
  const loadError = isLoadingDetail
    ? (query.error ??
      (detail === null ? { data: { code: "NOT_FOUND" } } : null))
    : null;
  const loading = actions.loading || (isLoadingDetail && !loadError);
  const { isDirty } = form.formState;
  const { user } = useCurrentUser();
  const draftValues = parsePageDraft(useWatch({ control: form.control })) ?? {};
  const previousRecord = useRef<
    { id: string | null; detail: typeof detail } | undefined
  >(undefined);

  useEffect(() => {
    const previous = previousRecord.current;
    previousRecord.current = { id, detail };
    if (previous?.id === id) {
      // Dirty-state changes must not reapply an older query snapshot.
      if (previous.detail === detail) return;
      if ((isDirty || actions.loading) && previous.detail?.id === id) return;
    }
    if (id && detail?.id !== id) {
      if (previous?.id !== id) {
        form.reset({ template: PageTemplate.DEFAULT });
      }
      return;
    }
    form.reset(
      toPageEditorFormValues(id ? detail : undefined) ?? {
        template: PageTemplate.DEFAULT,
      },
    );
  }, [actions.loading, detail, form, id, isDirty]);

  const recordGeneration = useRef(0);
  useEffect(
    () => () => {
      recordGeneration.current += 1;
    },
    [id, user?.id],
  );
  const previousAccount = useRef(user?.id);
  useEffect(() => {
    if (previousAccount.current !== user?.id) {
      previousAccount.current = user?.id;
      form.reset(
        toPageEditorFormValues(
          id && detail?.id === id ? detail : undefined,
        ) ?? { template: PageTemplate.DEFAULT },
      );
    }
  }, [user?.id, id, detail, form]);

  const draft = useLocalDraft({
    storageKey:
      user &&
      can(user.level, id ? Permission.pageUpdate : Permission.pageCreate)
        ? `honeycomb:draft:page:${encodeURIComponent(user.id)}:${id ?? "new"}`
        : null,
    values: draftValues,
    dirty: isDirty,
    ready: !isLoadingDetail,
    parse: parsePageDraft,
    onRestore: (values) =>
      form.reset(
        { ...values, status: form.getValues("status") },
        { keepDefaultValues: true },
      ),
  });

  const submit = (status: PageStatus) => {
    if (isLoadingDetail) return;
    void form.handleSubmit(async (values) => {
      const submittedValues = JSON.stringify(form.getValues());
      const submittedDraft = parsePageDraft(form.getValues()) ?? {};
      const generation = recordGeneration.current;
      const result = await actions.submit(values, status);
      if (
        result.state === "error" ||
        previousRecord.current?.id !== id ||
        generation !== recordGeneration.current
      )
        return;

      draft.clearSaved(submittedDraft);
      const currentValues = form.getValues();
      form.reset({ ...values, status });
      if (JSON.stringify(currentValues) !== submittedValues) {
        // New edits stay dirty against the values that actually finished saving.
        form.reset({ ...currentValues, status }, { keepDefaultValues: true });
      }
    })();
  };
  const headerActions = loadError ? null : (
    <div className="flex flex-wrap gap-3">
      <PageEditorActionButtons
        isEdit={!!detail?.id}
        loading={loading}
        status={detail?.status}
        onSubmit={submit}
      />
    </div>
  );

  useAdminLayoutPageTitle(
    id ? "修改页面" : "添加新页面",
    `${id ?? "new"}:${actions.loading}`,
  );
  useAdminLayoutActions(
    headerActions,
    `${id ?? "new"}:${detail?.id ?? "new"}:${detail?.status ?? "draft"}:${loading}:${Boolean(loadError)}`,
  );

  if (loadError) {
    return (
      <EditorLoadError
        kind="页面"
        notFound={loadError.data?.code === "NOT_FOUND"}
        listHref="/admin/page"
        onRetry={query.refetch}
      />
    );
  }

  const readOnly = isLoadingDetail || (!id && actions.loading);
  return (
    <div inert={readOnly} aria-busy={readOnly}>
      <LocalDraftPrompt {...draft} />
      <PageEditorForm form={form} />
    </div>
  );
}
/**
 * 页面编辑页组件，负责加载页面数据、初始化表单并组合编辑器。
 */
