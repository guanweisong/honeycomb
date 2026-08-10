"use client";

import { useRef, useState } from "react";
import { authClient } from "@/auth-client";
import { Button } from "@/packages/ui/components/button";
import { toast } from "sonner";

const PasswordSettings = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authClient.$fetch("/change-password", {
        method: "POST",
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        },
      });

      if (result.error) {
        toast.error(result.error.message || "密码修改失败");
        return;
      }

      formRef.current?.reset();
      toast.success("密码修改成功，其他设备已退出登录");
    } catch {
      toast.error("密码修改请求失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 border-t pb-6 pt-6">
      <div>
        <h2 className="text-base font-semibold">修改密码</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          修改密码后，其他设备上的登录会话将自动失效。
        </p>
      </div>
      <form ref={formRef} className="space-y-3" onSubmit={changePassword}>
        <input
          data-testid="current-password-input"
          name="currentPassword"
          type="password"
          required
          placeholder="当前密码"
          className="h-10 w-full rounded-md border px-3 text-sm"
        />
        <input
          data-testid="new-password-input"
          name="newPassword"
          type="password"
          required
          minLength={6}
          placeholder="新密码（至少 6 位）"
          className="h-10 w-full rounded-md border px-3 text-sm"
        />
        <input
          data-testid="confirm-password-input"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          placeholder="确认新密码"
          className="h-10 w-full rounded-md border px-3 text-sm"
        />
        <Button
          data-testid="change-password-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "修改中..." : "修改密码"}
        </Button>
      </form>
    </section>
  );
};

export default PasswordSettings;
