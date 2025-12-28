// @ts-ignore
import createMiddleware from "next-intl/middleware";
import { routing } from "@/app/(blog)/i18n/routing";

/**
 * 国际化 (i18n) 路由中间件。
 * 使用 `next-intl` 库创建，根据用户的语言偏好（如路径前缀 `/en` 或 `/zh`）
 * 来显示对应语言的页面内容。
 * @param {object} routing - 从 `./i18n/routing` 导入的 i18n 路由配置。
 */
export default createMiddleware(routing);

/**
 * 中间件的配置对象。
 * `matcher` 定义了哪些路径应该被这个中间件处理。
 */
export const config = {
  /**
   * 匹配除了以下情况之外的所有路径：
   * - 以 `/api`, `/trpc`, `/_next`, `/_vercel` 开头的路径（通常是 API 或 Next.js 内部路由）。
   * - 包含 `.` 的路径（通常是静态文件，如 `favicon.ico`）。
   */
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
