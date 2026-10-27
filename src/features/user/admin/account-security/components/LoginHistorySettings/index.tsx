"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client/trpc";
import { toast } from "sonner";

import type { LoginHistoryEvent } from "@/features/user/account-security/login-history-events";
import { SOCIAL_PROVIDER_LABELS } from "@/lib/auth/providers";
import { formatAccountSecurityDate } from "@/features/user/admin/account-security/components/account-security-date";

const eventLabels: Record<LoginHistoryEvent, string> = {
  LOGIN_SUCCESS: "登录成功",
  LOGIN_FAILURE: "登录失败",
  SIGN_OUT: "退出登录",
  REVOKE_OTHER_SESSIONS: "退出其他设备",
};

const providerLabels: Record<string, string> = {
  password: "用户名密码",
  passkey: "Passkey",
  session: "会话管理",
  ...SOCIAL_PROVIDER_LABELS,
  oauth: "OAuth",
};

const LoginHistorySettings = () => {
  const {
    data: history,
    error,
    isPending,
    isFetching,
    refetch,
  } = trpc.accountSecurity.loginHistory.useQuery();

  useEffect(() => {
    if (error) toast.error("登录历史加载失败，请稍后重试");
  }, [error]);

  if (isPending) {
    return (
      <section className="space-y-3" aria-label="正在加载登录历史">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </section>
    );
  }

  if (error && !history) {
    return (
      <section className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          登录历史加载失败，请稍后重试。
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          重新加载
        </Button>
      </section>
    );
  }

  if (!history?.length) {
    return <p className="text-sm text-muted-foreground">暂无登录历史。</p>;
  }

  return (
    <section>
      <ul className="space-y-3">
        {history.map((item) => (
          <li key={item.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{eventLabels[item.event]}</p>
              <time className="text-muted-foreground">
                {formatAccountSecurityDate(item.createdAt)}
              </time>
            </div>
            <p className="mt-1 text-muted-foreground">
              方式：
              {providerLabels[item.provider ?? ""] ?? item.provider ?? "未知"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {item.ipAddress ?? "未知 IP"} · {item.userAgent ?? "未知设备"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default LoginHistorySettings;
/**
 * 登录历史组件，负责展示登录安全事件和时间格式化。
 */
