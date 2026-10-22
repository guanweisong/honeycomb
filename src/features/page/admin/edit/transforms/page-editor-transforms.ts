import type { z } from "zod";
import { PageFieldsSchema } from "@/features/page/schemas/page.fields.schema";
import { PageTemplate } from "@/features/page/types/page.template";

type PageEditorFormValues = z.infer<typeof PageFieldsSchema>;

type PageEditorDetail = {
  title?: PageEditorFormValues["title"] | null;
  content?: PageEditorFormValues["content"] | null;
  status?: PageEditorFormValues["status"];
  template?: PageTemplate | null;
} | null;

export function getPageEditorId(searchParams: Pick<URLSearchParams, "get">) {
  return searchParams.get("id");
}

export function toPageEditorFormValues(
  detail?: PageEditorDetail,
): Partial<PageEditorFormValues> | undefined {
  if (!detail) return undefined;

  return {
    title: detail.title ?? undefined,
    content: detail.content ?? undefined,
    status: detail.status ?? undefined,
    template: detail.template ?? PageTemplate.DEFAULT,
  };
}
/**
 * 页面编辑路由参数、详情数据和表单值转换函数。
 */
