import "server-only";

import { cache } from "react";
import { createServerClient } from "@/packages/trpc/api";
import type { MenuType } from "@/packages/domain/navigation/menu";

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
