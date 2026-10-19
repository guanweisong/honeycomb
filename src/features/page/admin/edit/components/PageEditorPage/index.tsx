"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  PageInsertSchema,
  type PageInsert,
} from "@/features/page/application/write-schema";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "@/packages/ui/extended/AdminLayout";
import { EditorLoadError } from "@/packages/ui/admin/editor-load-error";
import { PageEditorActionButtons } from "../PageEditorActionButtons";
import { PageEditorForm } from "../PageEditorForm";
import { usePageEditorActions } from "../../actions/page-editor-actions";
import { usePageEditorQuery } from "../../queries/page-editor-query";
import {
  getPageEditorId,
  toPageEditorFormValues,
} from "../../transforms/page-editor-transforms";

export function PageEditorPage() {
  const id = getPageEditorId(useSearchParams());
  const form = useForm<PageInsert>({
    resolver: zodResolver(PageInsertSchema),
    defaultValues: { template: PageTemplate.DEFAULT },
  });
  const query = usePageEditorQuery(id);
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

  const submit = (status: PageStatus) => {
    if (isLoadingDetail) return;
    void form.handleSubmit(async (values) => {
      const submittedValues = JSON.stringify(form.getValues());
      const result = await actions.submit(values, status);
      if (result.state === "error" || previousRecord.current?.id !== id) return;

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
      <PageEditorForm form={form} />
    </div>
  );
}
/**
 * 页面编辑页组件，负责加载页面数据、初始化表单并组合编辑器。
 */
