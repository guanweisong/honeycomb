"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthenticatorName } from "@better-auth/passkey";
import { authClient } from "@/auth-client";
import { Button } from "@/packages/ui/components/button";
import { Skeleton } from "@/packages/ui/components/skeleton";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { toast } from "sonner";

function formatCreatedAt(value: Date | string | undefined) {
  if (!value) return "未知时间";
  return new Date(value).toLocaleDateString("zh-CN");
}

const PasskeySettings = () => {
  const passkeysQuery = authClient.useListPasskeys();
  const nameInput = useRef<HTMLInputElement>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");

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

  const renamePasskey = async () => {
    if (!renameTarget || !renameName.trim()) return;
    const result = await authClient.$fetch("/passkey/update-passkey", {
      method: "POST",
      body: { id: renameTarget.id, name: renameName.trim() },
    });
    if (result.error) {
      toast.error(result.error.message || "Passkey 重命名失败");
      return;
    }
    await passkeysQuery.refetch();
    setRenameTarget(null);
    setRenameName("");
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
    return (
      <section className="space-y-6 pb-6" aria-label="正在加载 Passkey">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>
    );
  }

  if (!isSupported) {
    return (
      <p>
        当前浏览器不支持 Passkey，请继续使用密码登录。
      </p>
    );
  }

  return (
    <section className="space-y-6 pb-6">
      <div>
        <p className="text-sm text-muted-foreground">
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
                  data-testid="passkey-rename-button"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRenameTarget({ id: passkey.id, name: label });
                    setRenameName(label);
                  }}
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

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
            setRenameName("");
          }
        }}
        title="重命名 Passkey"
        onOK={renamePasskey}
        OKProps={{
          children: "保存",
          disabled: !renameName.trim(),
        }}
      >
        <input
          key={renameTarget?.id ?? "rename-passkey"}
          data-testid="passkey-rename-input"
          value={renameName}
          onChange={(event) => setRenameName(event.target.value)}
          placeholder="请输入 Passkey 名称"
          className="h-10 w-full rounded-md border px-3 text-sm"
        />
      </Dialog>
    </section>
  );
};

export default PasskeySettings;
