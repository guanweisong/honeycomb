"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthenticatorName } from "@better-auth/passkey";
import { authClient } from "@/auth-client";
import { Button } from "@/packages/ui/components/button";
import { toast } from "sonner";

function formatCreatedAt(value: Date | string | undefined) {
  if (!value) return "未知时间";
  return new Date(value).toLocaleDateString("zh-CN");
}

const PasskeySettings = () => {
  const passkeysQuery = authClient.useListPasskeys();
  const nameInput = useRef<HTMLInputElement>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        typeof window.PublicKeyCredential !== "undefined",
    );
  }, []);

  const addPasskey = async () => {
    const result = await authClient.passkey.addPasskey({
      name: nameInput.current?.value.trim() || undefined,
    });
    if (result.error) {
      toast.error(result.error.message || "Passkey 注册失败");
      return;
    }
    if (nameInput.current) nameInput.current.value = "";
    toast.success("Passkey 注册成功");
  };

  const renamePasskey = async (id: string, currentName: string) => {
    const nextName = window.prompt("请输入新的 Passkey 名称", currentName);
    if (!nextName?.trim()) return;
    const result = await authClient.$fetch("/passkey/update-passkey", {
      method: "POST",
      body: { id, name: nextName.trim() },
    });
    if (result.error) {
      toast.error(result.error.message || "Passkey 重命名失败");
      return;
    }
    toast.success("Passkey 已重命名");
  };

  const deletePasskey = async (id: string) => {
    if (!window.confirm("确定删除这个 Passkey 吗？")) return;
    const result = await authClient.$fetch("/passkey/delete-passkey", {
      method: "POST",
      body: { id },
    });
    if (result.error) {
      toast.error(result.error.message || "Passkey 删除失败");
      return;
    }
    toast.success("Passkey 已删除");
  };

  if (passkeysQuery.isPending) {
    return <p>正在加载 Passkey...</p>;
  }

  if (!isSupported) {
    return <p>当前浏览器不支持 Passkey，请继续使用密码登录。</p>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Passkey</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          使用设备指纹、面容、PIN 或安全密钥登录。
        </p>
      </div>

      <div className="flex gap-2">
        <input
          data-testid="passkey-name-input"
          ref={nameInput}
          placeholder="Passkey 名称（可选）"
          className="h-10 flex-1 rounded-md border px-3 text-sm"
        />
        <Button
          data-testid="passkey-add-button"
          type="button"
          onClick={addPasskey}
        >
          注册 Passkey
        </Button>
      </div>

      <ul className="space-y-3">
        {(passkeysQuery.data ?? []).map((passkey) => {
          const label =
            passkey.name || getAuthenticatorName(passkey.aaguid) || "Passkey";
          return (
            <li
              key={passkey.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">
                  {passkey.deviceType} · {formatCreatedAt(passkey.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => renamePasskey(passkey.id, label)}
                >
                  重命名
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deletePasskey(passkey.id)}
                >
                  删除
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PasskeySettings;
