import "server-only";

import { createTRPCRouter } from "./core";
import { linkRouter } from "@/features/link/transport/link.router";
import { userRouter } from "@/features/user/transport/user.router";
import { categoryRouter } from "@/features/category/transport/category.router";
import { tagRouter } from "@/features/tag/transport/tag.router";
import { settingRouter } from "@/features/setting/transport/setting.router";
import { statisticRouter } from "@/features/setting/transport/statistic.router";
import { menuRouter } from "@/features/menu/transport/menu.router";
import { mediaRouter } from "@/features/media/transport/media.router";
import { pageRouter } from "@/features/page/transport/page.router";
import { postRouter } from "@/features/post/transport/post.router";
import { commentRouter } from "@/features/comment/transport/comment.router";
import { accountSecurityRouter } from "@/features/user/transport/account-security.router";

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
