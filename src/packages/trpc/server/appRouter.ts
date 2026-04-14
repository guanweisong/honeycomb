import { createTRPCRouter } from "./core";
import { linkRouter } from "@/packages/trpc/server/modules/link/link.router";
import { userRouter } from "@/packages/trpc/server/modules/user/user.router";
import { categoryRouter } from "@/packages/trpc/server/modules/category/category.router";
import { tagRouter } from "@/packages/trpc/server/modules/tag/tag.router";
import { tokenRouter } from "@/packages/trpc/server/modules/token/token.router";
import { settingRouter } from "@/packages/trpc/server/modules/setting/setting.router";
import { statisticRouter } from "@/packages/trpc/server/modules/statistic/statistic.router";
import { menuRouter } from "@/packages/trpc/server/modules/menu/menu.router";
import { mediaRouter } from "@/packages/trpc/server/modules/media/media.router";
import { pageRouter } from "@/packages/trpc/server/modules/page/page.router";
import { postRouter } from "@/packages/trpc/server/modules/post/post.router";
import { commentRouter } from "@/packages/trpc/server/modules/comment/comment.router";
import { authRouter } from "@/packages/trpc/server/modules/auth/auth.router";

export const appRouter = createTRPCRouter({
  link: linkRouter,
  user: userRouter,
  category: categoryRouter,
  tag: tagRouter,
  token: tokenRouter,
  setting: settingRouter,
  statistic: statisticRouter,
  menu: menuRouter,
  media: mediaRouter,
  page: pageRouter,
  post: postRouter,
  comment: commentRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
