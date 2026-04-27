import { createTRPCRouter } from "./core";
import { linkRouter } from "@/packages/trpc/api/modules/link/link.router";
import { userRouter } from "@/packages/trpc/api/modules/user/user.router";
import { categoryRouter } from "@/packages/trpc/api/modules/category/category.router";
import { tagRouter } from "@/packages/trpc/api/modules/tag/tag.router";
import { settingRouter } from "@/packages/trpc/api/modules/setting/setting.router";
import { statisticRouter } from "@/packages/trpc/api/modules/statistic/statistic.router";
import { menuRouter } from "@/packages/trpc/api/modules/menu/menu.router";
import { mediaRouter } from "@/packages/trpc/api/modules/media/media.router";
import { pageRouter } from "@/packages/trpc/api/modules/page/page.router";
import { postRouter } from "@/packages/trpc/api/modules/post/post.router";
import { commentRouter } from "@/packages/trpc/api/modules/comment/comment.router";

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
});

export type AppRouter = typeof appRouter;
