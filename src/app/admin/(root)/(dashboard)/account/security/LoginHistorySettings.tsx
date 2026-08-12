"use client";

import { useEffect } from "react";
import { Skeleton } from "@/packages/ui/components/skeleton";
import { trpc } from "@/packages/trpc/client/trpc";
import { toast } from "sonner";

type LoginHistoryItem = {
  id: string;
  event:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "SIGN_OUT"
    | "REVOKE_OTHER_SESSIONS";
  provider: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const eventLabels: Record<LoginHistoryItem["event"], string> = {
  LOGIN_SUCCESS: "登录成功",
  LOGIN_FAILURE: "登录失败",
  SIGN_OUT: "退出登录",
  REVOKE_OTHER_SESSIONS: "退出其他设备",
};

const providerLabels: Record<string, string> = {
  password: "用户名密码",
  passkey: "Passkey",
  session: "会话管理",
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  oauth: "OAuth",
};

function formatHistoryDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "未知时间"
    : date.toLocaleString("zh-CN", { hour12: false });
}

const LoginHistorySettings = () => {
  const { data: history = [], error, isPending } =
    trpc.accountSecurity.loginHistory.useQuery();

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

  if (history.length === 0) {
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
                {formatHistoryDate(item.createdAt)}
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
