"use client";

import { useRef } from "react";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { useAccountMutation } from "../use-account-mutation";
import { authClient } from "@/auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PasswordSettings = () => {
  const { user } = useCurrentUser();
  return <PasswordSettingsPanel key={user?.id} />;
};

const PasswordSettingsPanel = () => {
  const mutation = useAccountMutation();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = mutation.pending;

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

    await mutation.run({
      mutate: () =>
        authClient.$fetch("/change-password", {
          method: "POST",
          body: { currentPassword, newPassword, revokeOtherSessions: true },
        }),
      failure: "密码修改失败",
      success: "密码修改成功，其他设备已退出登录",
      committed: () => formRef.current?.reset(),
    });
  };

  return (
    <section className="space-y-4 pb-6">
      <div>
        <p className="text-sm text-muted-foreground">
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
/**
 * 密码设置组件，负责修改当前用户密码。
 */
