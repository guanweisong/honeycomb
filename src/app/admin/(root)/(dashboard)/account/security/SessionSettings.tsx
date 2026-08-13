"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/auth-client";
import { Button } from "@/packages/ui/components/button";
import { Skeleton } from "@/packages/ui/components/skeleton";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { toast } from "sonner";

type SessionItem = {
  id: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function formatSessionDate(value: Date | string | undefined) {
  if (!value) return "未知时间";
  const numericValue =
    typeof value === "string" && /^\d+(\.\d+)?$/.test(value)
      ? Number(value)
      : value;
  const date = new Date(numericValue);
  return Number.isNaN(date.getTime())
    ? "未知时间"
    : date.toLocaleString("zh-CN", { hour12: false });
}

function getDeviceName(userAgent: string | null | undefined) {
  if (!userAgent) return "未知设备";
  if (/iphone|ipad/i.test(userAgent)) return "iPhone / iPad";
  if (/android/i.test(userAgent)) return "Android 设备";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac 设备";
  if (/windows/i.test(userAgent)) return "Windows 设备";
  return "其他设备";
}

const SessionSettings = () => {
  const [isRevoking, setIsRevoking] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryKey: ["account-security", "sessions"],
    queryFn: async () => {
      const result = await authClient.$fetch("/list-sessions");
      if (result.error) throw new Error(result.error.message || "登录会话加载失败");
      return (result.data ?? []) as SessionItem[];
    },
    staleTime: 0,
  });
  const sessions = sessionsQuery.data ?? [];
  const isLoading = sessionsQuery.isPending && !sessionsQuery.data;

  useEffect(() => {
    if (sessionsQuery.error) toast.error("登录会话加载失败，请稍后重试");
  }, [sessionsQuery.error]);

  const revokeOtherSessions = async () => {
    setIsRevoking(true);
    try {
      const result = await authClient.$fetch("/revoke-other-sessions", {
        method: "POST",
        body: {},
      });
      if (result.error) {
        toast.error(result.error.message || "退出其他设备失败");
        return;
      }
      toast.success("其他设备已退出登录");
      await queryClient.invalidateQueries({
        queryKey: ["account-security", "sessions"],
      });
    } catch {
      toast.error("退出其他设备请求失败，请稍后重试");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            查看当前账号的有效登录设备。
          </p>
        </div>
        <Button
          data-testid="revoke-other-sessions-button"
          type="button"
          variant="outline"
          size="sm"
          disabled={isRevoking || sessions.length < 2}
          onClick={() => setIsRevokeDialogOpen(true)}
        >
          退出其他设备
        </Button>
      </div>

      {isLoading ? (
        <div
          className="space-y-3"
          aria-label="正在加载登录会话"
        >
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无有效登录会话。</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{getDeviceName(session.userAgent)}</p>
              <p className="mt-1 text-muted-foreground">
                {session.ipAddress || "未知 IP"} · 登录于 {formatSessionDate(session.createdAt)}
              </p>
              <p className="mt-1 text-muted-foreground">
                到期于 {formatSessionDate(session.expiresAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={isRevokeDialogOpen}
        onOpenChange={setIsRevokeDialogOpen}
        title="退出其他设备"
        description="确认后，其他设备上的登录会话将立即失效。当前设备不会退出。"
        onOK={revokeOtherSessions}
        OKProps={{ children: "确认退出" }}
        type="danger"
      />
    </section>
  );
};

export default SessionSettings;
