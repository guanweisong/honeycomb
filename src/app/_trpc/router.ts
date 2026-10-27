import "server-only";

import { createTRPCRouter } from "@/lib/trpc/core";
import { linkRouter } from "@/features/link/router";
import { userRouter } from "@/features/user/router";
import { categoryRouter } from "@/features/category/router";
import { tagRouter } from "@/features/tag/router";
import { settingRouter } from "@/features/setting/router";
import { statisticRouter } from "@/features/dashboard/router";
import { menuRouter } from "@/features/menu/router";
import { mediaRouter } from "@/features/media/router";
import { pageRouter } from "@/features/page/router";
import { postRouter } from "@/features/post/router";
import { commentRouter } from "@/features/comment/router";
import { accountSecurityRouter } from "@/features/user/account-security.router";

export const appRouter = createTRPCRouter({
  link: linkRouter,
  user: userRouter,
  category: categoryRouter,
  tag: tagRouter,
  setting: settingRouter,
  statistic: statisticRouter,
  menu: menuRouter,
  media: mediaRouter,
  page: pageRouter,
  post: postRouter,
  comment: commentRouter,
  accountSecurity: accountSecurityRouter,
});

export type AppRouter = typeof appRouter;
