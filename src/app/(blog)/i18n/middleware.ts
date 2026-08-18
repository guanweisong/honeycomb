import createMiddleware from "next-intl/middleware";
import { routing } from "@/packages/ui/navigation/routing";

export default createMiddleware(routing);

export const config = {
  // 匹配所有路径，但排除以下情况：
  // - 以 `/api`、`/trpc`、`/_next` 或 `/_vercel` 开头的路径；
  // - 包含点号的路径，例如 `favicon.ico`。
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
