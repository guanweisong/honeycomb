"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthenticatorName } from "@better-auth/passkey";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { useAccountMutation } from "../use-account-mutation";
import { authClient } from "@/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/Dialog";

function formatCreatedAt(value: Date | string | undefined) {
  if (!value) return "未知时间";
  return new Date(value).toLocaleDateString("zh-CN");
}

const PasskeySettings = () => {
  const { user } = useCurrentUser();
  return <PasskeySettingsPanel key={user?.id} />;
};

const PasskeySettingsPanel = () => {
  const mutation = useAccountMutation();
  const passkeysQuery = authClient.useListPasskeys();
  const nameInput = useRef<HTMLInputElement>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" &&
        typeof window.PublicKeyCredential !== "undefined",
    );
  }, []);

  const refreshPasskeys = async () => {
    await passkeysQuery.refetch();
    // BetterAuth resolves refetch even on failure and stores the error in its atom.
    // Read the current atom, not the hook snapshot captured before this request.
    const atom = authClient.$store.atoms.listPasskeys;
    if (!atom) throw new Error("Passkey 列表刷新状态不可用");
    const state: unknown = atom.get();
    if (state && typeof state === "object" && "error" in state && state.error) {
      throw new Error("Passkey 列表刷新失败");
    }
  };

  const addPasskey = () =>
    mutation.run({
      mutate: () =>
        authClient.passkey.addPasskey({
          name: nameInput.current?.value.trim() || undefined,
        }),
      failure: "Passkey 注册失败",
      success: "Passkey 注册成功",
      committed: () => {
        if (nameInput.current) nameInput.current.value = "";
      },
    });

  const renamePasskey = async () => {
    if (!renameTarget || !renameName.trim()) return false;
    return mutation.run({
      mutate: () =>
        authClient.$fetch("/passkey/update-passkey", {
          method: "POST",
          body: { id: renameTarget.id, name: renameName.trim() },
        }),
      failure: "Passkey 重命名失败",
      success: "Passkey 已重命名",
      committed: () => {
        setRenameTarget(null);
        setRenameName("");
      },
      refresh: refreshPasskeys,
    });
  };

  const deletePasskey = async () => {
    if (!deleteTarget) return false;
    return mutation.run({
      mutate: () =>
        authClient.$fetch("/passkey/delete-passkey", {
          method: "POST",
          body: { id: deleteTarget },
        }),
      failure: "Passkey 删除失败",
      success: "Passkey 已删除",
      committed: () => setDeleteTarget(null),
      refresh: refreshPasskeys,
    });
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
    return <p>当前浏览器不支持 Passkey，请继续使用密码登录。</p>;
  }

  // Better Auth retains valid data on transient failures but clears it on 401.
  // Use that snapshot directly rather than restoring credentials after expiry.
  const passkeys = passkeysQuery.data;
  const readError = passkeysQuery.error ? (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">
        {passkeys
          ? "Passkey 刷新失败，当前显示上次加载的列表，请稍后重试。"
          : "Passkey 加载失败，请稍后重试。"}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={passkeysQuery.isRefetching}
        onClick={() => void passkeysQuery.refetch()}
      >
        重新加载
      </Button>
    </div>
  ) : null;

  if (passkeysQuery.error && !passkeys) {
    return <section className="space-y-6 pb-6">{readError}</section>;
  }

  return (
    <section className="space-y-6 pb-6">
      {readError}
      <div>
        <p className="text-sm text-muted-foreground">
          使用设备指纹、面容、PIN 或安全密钥登录。
        </p>
      </div>

      <div className="flex gap-2">
        <input
          data-testid="passkey-name-input"
          aria-label="Passkey 名称（可选）"
          ref={nameInput}
          placeholder="Passkey 名称（可选）"
          className="h-10 flex-1 rounded-md border px-3 text-sm"
        />
        <Button
          data-testid="passkey-add-button"
          type="button"
          onClick={addPasskey}
          disabled={mutation.pending}
        >
          注册 Passkey
        </Button>
      </div>

      {passkeys?.length === 0 && (
        <p className="text-sm text-muted-foreground">暂无 Passkey。</p>
      )}

      <ul className="space-y-3">
        {(passkeys ?? []).map((passkey) => {
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
                  disabled={mutation.pending}
                  size="sm"
                  onClick={() => {
                    setRenameTarget({ id: passkey.id, name: label });
                    setRenameName(label);
                  }}
                >
                  重命名
                </Button>
                <Button
                  data-testid="passkey-delete-button"
                  type="button"
                  variant="destructive"
                  disabled={mutation.pending}
                  size="sm"
                  onClick={() => setDeleteTarget(passkey.id)}
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
            mutation.cancelFeedback();
            setRenameTarget(null);
            setRenameName("");
          }
        }}
        title="重命名 Passkey"
        onOK={renamePasskey}
        OKProps={{
          children: "保存",
          disabled: mutation.pending || !renameName.trim(),
        }}
      >
        <input
          key={renameTarget?.id ?? "rename-passkey"}
          data-testid="passkey-rename-input"
          aria-label="Passkey 名称"
          value={renameName}
          onChange={(event) => setRenameName(event.target.value)}
          placeholder="请输入 Passkey 名称"
          className="h-10 w-full rounded-md border px-3 text-sm"
        />
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            mutation.cancelFeedback();
            setDeleteTarget(null);
          }
        }}
        title="删除 Passkey"
        description="删除后将无法使用此 Passkey 登录。"
        type="danger"
        onOK={deletePasskey}
        OKProps={{
          children: "删除",
          disabled: mutation.pending,
          id: "passkey-delete-confirm-button",
        }}
      />
    </section>
  );
};

export default PasskeySettings;
/**
 * Passkey 设置组件，负责创建、重命名和删除 WebAuthn 凭据。
 */
