import { router } from "./core";
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
import { createContext } from "./context";

/**
 * 应用程序的主 tRPC 路由。
 * 聚合了所有子路由，形成了完整的 API 结构。
 */
export const appRouter = router({
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

/**
 * 应用程序主路由的 TypeScript 类型。
 * 用于在客户端和服务端之间提供类型安全。
 */
export type AppRouter = typeof appRouter;

/**
 * 服务端 tRPC 客户端实例。
 * 允许在服务端直接调用 tRPC 路由，无需通过 HTTP 请求。
 * 主要用于服务端渲染 (SSR) 或在 API 路由内部调用其他 tRPC 路由。
 */
export const serverClient = appRouter.createCaller(await createContext({}));
