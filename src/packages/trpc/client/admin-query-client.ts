import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";

type AuthErrorCode = "UNAUTHORIZED" | "FORBIDDEN";

type AdminQueryClientOptions = {
  onForbidden?: () => void;
};

/**
 * 从 tRPC 客户端错误中提取需要由后台统一处理的认证错误码。
 *
 * 不使用 instanceof，避免错误经过不同 bundle 或序列化边界后识别失败。
 */
export function getAuthErrorCode(error: unknown): AuthErrorCode | undefined {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return undefined;
  }

  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data)) {
    return undefined;
  }

  if (data.code === "UNAUTHORIZED" || data.code === "FORBIDDEN") {
    return data.code;
  }

  return undefined;
}

/**
 * 统一处理后台 API 的认证与授权错误。
 *
 * 401 代表登录态已失效，回到登录页；403 代表用户已登录但无权访问，
 * 进入统一的无权限页面。普通业务和网络错误仍交由调用页面展示。
 */
export function createAdminQueryClient(
  options: AdminQueryClientOptions = {},
) {
  const handleAuthError = (error: unknown) => {
    if (typeof window === "undefined") {
      return;
    }

    const code = getAuthErrorCode(error);

    if (
      code === "UNAUTHORIZED" &&
      window.location.pathname !== "/admin/login"
    ) {
      // 登录态失效时整页跳转，确保内存中的用户数据和请求缓存被清理。
      window.location.replace("/admin/login");
      return;
    }

    if (
      code === "FORBIDDEN" &&
      window.location.pathname !== "/admin/forbidden"
    ) {
      if (options.onForbidden) {
        options.onForbidden();
      } else {
        window.location.replace("/admin/forbidden");
      }
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleAuthError,
    }),
    mutationCache: new MutationCache({
      onError: handleAuthError,
    }),
    defaultOptions: {
      queries: {
        retry(failureCount, error) {
          if (getAuthErrorCode(error)) {
            return false;
          }

          return failureCount < 3;
        },
      },
      mutations: {
        // 写操作保持 React Query 的默认语义，避免失败后重复提交。
        retry: false,
      },
    },
  });
}
