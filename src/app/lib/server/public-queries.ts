import "server-only";

import { cache } from "react";
import { createServerClient } from "@/packages/trpc/api";
import type { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { MAX_PAGE_SIZE } from "@/packages/application/resource-limits";

/** 逐页读取友情链接，保留完整公开列表并遵守单次查询上限。 */
export const getPublicLinks = cache(async () => {
  const client = await createServerClient();
  const input = { limit: MAX_PAGE_SIZE, status: [EnableStatus.ENABLE] };
  const first = await client.link.index({ ...input, page: 1 });
  const list = [...first.list];
  for (let page = 2; page <= Math.ceil(first.total / MAX_PAGE_SIZE); page++) {
    const result = await client.link.index({ ...input, page });
    list.push(...result.list);
    if (result.list.length === 0) break;
  }
  return { list, total: first.total };
});

export const getPublicSetting = cache(async () => {
  const client = await createServerClient();
  return client.setting.index();
});

export const getPublicMenu = cache(async () => {
  const client = await createServerClient();
  return client.menu.index();
});

export const getPublicPostDetail = cache(async (id: string) => {
  const client = await createServerClient();
  return client.post.detail({ id });
});

export const getPublicPageDetail = cache(async (id: string) => {
  const client = await createServerClient();
  return client.page.detail({ id });
});

export const getPublicComments = cache(async (id: string, type: MenuType) => {
  const client = await createServerClient();
  return client.comment.listByRef({ id, type });
});
