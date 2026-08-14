"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  PageInsertSchema,
  type PageInsert,
} from "@/packages/trpc/api/modules/page/schemas/page.insert.schema";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "@/packages/ui/extended/AdminLayout";
import { PageEditorActionButtons } from "../PageEditorActionButtons";
import { PageEditorForm } from "../PageEditorForm";
import { usePageEditorActions } from "../../actions/pageEditorActions";
import { usePageEditorQuery } from "../../queries/pageEditorQuery";
import {
  getPageEditorId,
  toPageEditorFormValues,
} from "../../transforms/pageEditorTransforms";

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

  useEffect(() => {
    form.reset(
      toPageEditorFormValues(detail) ?? { template: PageTemplate.DEFAULT },
    );
  }, [detail, form]);

  const submit = (status: PageStatus) => {
    void form.handleSubmit((values) => actions.submit(values, status))();
  };
  const headerActions = (
    <div className="flex flex-wrap gap-3">
      <PageEditorActionButtons
        isEdit={!!detail?.id}
        loading={actions.loading}
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
    `${detail?.id ?? "new"}:${detail?.status ?? "draft"}:${actions.loading}`,
  );

  return <PageEditorForm form={form} />;
}
/**
 * 页面编辑页组件，负责加载页面数据、初始化表单并组合编辑器。
 */
