import "server-only";

import { createTRPCRouter } from "./core";
import { linkRouter } from "@/features/link/link.router";
import { userRouter } from "@/features/user/user.router";
import { categoryRouter } from "@/features/category/category.router";
import { tagRouter } from "@/features/tag/tag.router";
import { settingRouter } from "@/features/setting/setting.router";
import { statisticRouter } from "@/features/setting/statistic.router";
import { menuRouter } from "@/features/menu/menu.router";
import { mediaRouter } from "@/features/media/media.router";
import { pageRouter } from "@/features/page/page.router";
import { postRouter } from "@/features/post/post.router";
import { commentRouter } from "@/features/comment/comment.router";
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
