import { createTRPCRouter } from "./core";
import { linkRouter } from "./routers/link";
import { userRouter } from "./routers/user";
import { categoryRouter } from "./routers/category";
import { tagRouter } from "./routers/tag";
import { tokenRouter } from "./routers/token";
import { settingRouter } from "./routers/setting";
import { statisticRouter } from "./routers/statistic";
import { menuRouter } from "./routers/menu";
import { mediaRouter } from "./routers/media";
import { pageRouter } from "./routers/page";
import { postRouter } from "./routers/post";
import { commentRouter } from "./routers/comment";
import { authRouter } from "./routers/auth";

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
