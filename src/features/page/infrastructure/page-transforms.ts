import type { InferInsertModel } from "drizzle-orm";

import type { PageCreateCommand, PageUpdateCommand } from "../application/repository";
import * as schema from "@/packages/infrastructure/db/schema";
import { sanitizeRichText } from "@/packages/infrastructure/security/sanitize-html";

type PageInsertValues = InferInsertModel<typeof schema.page>;

function sanitizeContent(content: PageCreateCommand["content"]) {
  return {
    en: sanitizeRichText(content.en),
    zh: sanitizeRichText(content.zh),
  };
}

export function toPageInsertValues(
  input: PageCreateCommand,
  authorId: string,
): PageInsertValues {
  return {
    authorId,
    title: input.title,
    content: sanitizeContent(input.content),
    status: input.status,
    template: input.template,
  } satisfies PageInsertValues;
}

export function toPageUpdateValues(
  input: Omit<PageUpdateCommand, "id">,
): Partial<PageInsertValues> {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.content !== undefined
      ? { content: sanitizeContent(input.content) }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.template !== undefined ? { template: input.template } : {}),
  } satisfies Partial<PageInsertValues>;
}
