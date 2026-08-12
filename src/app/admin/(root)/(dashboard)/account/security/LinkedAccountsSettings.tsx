"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/auth-client";
import { Button } from "@/packages/ui/components/button";
import { Skeleton } from "@/packages/ui/components/skeleton";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { toast } from "sonner";
import type { SocialProviderId } from "@/packages/identity/auth/providers";

const providerLabels: Record<SocialProviderId, string> = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
};

type AccountItem = {
  id: string;
  providerId: string;
  accountId: string;
};

type Props = {
  providers: SocialProviderId[];
};

const LinkedAccountsSettings = ({ providers }: Props) => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unlinkTarget, setUnlinkTarget] = useState<AccountItem | null>(null);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const result = await authClient.listAccounts();
      if (result.error) {
        toast.error(result.error.message || "关联账号加载失败");
        return;
      }
      setAccounts((result.data ?? []) as AccountItem[]);
    } catch {
      toast.error("关联账号加载失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const linkedProviderIds = useMemo(
    () => new Set(accounts.map((account) => account.providerId)),
    [accounts],
  );

  const linkAccount = async (provider: SocialProviderId) => {
    const result = await authClient.linkSocial({
      provider,
      callbackURL: "/admin/account/security",
    });
    if (result.error) toast.error(result.error.message || "关联账号失败");
  };

  const unlinkAccount = async () => {
    if (!unlinkTarget) return;
    if (accounts.length <= 1) {
      toast.error("至少保留一种登录方式");
      return;
    }

    const result = await authClient.unlinkAccount({
      providerId: unlinkTarget.providerId,
      accountId: unlinkTarget.accountId,
    });
    if (result.error) {
      toast.error(result.error.message || "解除关联失败");
      return;
    }

    setUnlinkTarget(null);
    toast.success("已解除账号关联");
    await loadAccounts();
  };

  if (isLoading) {
    return (
      <section className="space-y-3" aria-label="正在加载关联账号">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        管理用于登录当前账号的第三方账号。
      </p>

      <ul className="space-y-3">
        {providers.map((provider) => {
          const account = accounts.find((item) => item.providerId === provider);
          return (
            <li
              key={provider}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="font-medium">{providerLabels[provider]}</p>
                <p className="text-sm text-muted-foreground">
                  {account ? "已关联" : "未关联"}
                </p>
              </div>
              {account ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUnlinkTarget(account)}
                >
                  解除关联
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void linkAccount(provider)}
                  disabled={linkedProviderIds.has(provider)}
                >
                  关联
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {providers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          当前环境未配置可关联的第三方登录方式。
        </p>
      )}

      <Dialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        title="解除账号关联"
        description={`确定解除 ${unlinkTarget ? providerLabels[unlinkTarget.providerId as SocialProviderId] : "该账号"} 关联吗？`}
        onOK={unlinkAccount}
        OKProps={{ children: "确认解除" }}
        type="danger"
      />
    </section>
  );
};

export default LinkedAccountsSettings;
