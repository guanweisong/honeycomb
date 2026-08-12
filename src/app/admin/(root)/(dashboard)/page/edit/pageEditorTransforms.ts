import type { z } from "zod";
import { PageInsertSchema } from "@/packages/trpc/api/modules/page/schemas/page.insert.schema";
import { PageTemplate } from "@/packages/domain/content/page-template";

type PageEditorFormValues = z.infer<typeof PageInsertSchema>;

type PageEditorDetail = {
  title?: PageEditorFormValues["title"] | null;
  content?: PageEditorFormValues["content"] | null;
  status?: PageEditorFormValues["status"];
  template?: string | null;
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
    template:
      (detail.template as PageTemplate | undefined) ?? PageTemplate.DEFAULT,
  };
}
