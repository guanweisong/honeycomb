"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { useAccountMutation } from "@/features/user/admin/account-security/components/use-account-mutation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/Dialog";
import { toast } from "sonner";
import {
  SOCIAL_PROVIDER_LABELS,
  type SocialProviderId,
} from "@/lib/auth/providers";

const providerLabels = SOCIAL_PROVIDER_LABELS;

// 与无 fetchOptions 的实际调用一致，避免泛型 ReturnType 丢失响应字段类型。
type AccountItem = Pick<
  NonNullable<
    Awaited<
      ReturnType<typeof authClient.listAccounts<Record<never, never>>>
    >["data"]
  >[number],
  "id" | "providerId" | "accountId"
>;

type Props = {
  providers: SocialProviderId[];
};

const LinkedAccountsSettings = (props: Props) => {
  const { user } = useCurrentUser();
  return <LinkedAccountsPanel key={user?.id} {...props} userId={user?.id} />;
};

const LinkedAccountsPanel = ({
  providers,
  userId,
}: Props & { userId?: string }) => {
  const mutation = useAccountMutation();
  const [unlinkTarget, setUnlinkTarget] = useState<AccountItem | null>(null);

  const queryClient = useQueryClient();
  const accountsQuery = useQuery({
    queryKey: ["account-security", "linked-accounts", userId],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error)
        throw new Error(result.error.message || "关联账号加载失败");
      return result.data ?? [];
    },
    staleTime: 0,
  });
  const accounts = accountsQuery.data;
  const isLoading = accountsQuery.isPending;

  useEffect(() => {
    if (accountsQuery.error) toast.error("关联账号加载失败，请稍后重试");
  }, [accountsQuery.error]);

  const linkAccount = (provider: SocialProviderId) =>
    mutation.run({
      mutate: () =>
        authClient.linkSocial({
          provider,
          callbackURL: "/admin/account/security",
        }),
      failure: "关联账号失败",
    });

  const unlinkAccount = async () => {
    if (!unlinkTarget) return false;
    if (!accounts || accounts.length <= 1) {
      toast.error("至少保留一种登录方式");
      return false;
    }
    return mutation.run({
      mutate: () => authClient.unlinkAccount({ accountId: unlinkTarget.id }),
      failure: "解除关联失败",
      success: "已解除账号关联",
      committed: () => setUnlinkTarget(null),
      refresh: () =>
        queryClient.invalidateQueries(
          { queryKey: ["account-security", "linked-accounts", userId] },
          { throwOnError: true },
        ),
    });
  };

  if (isLoading) {
    return (
      <section className="space-y-3" aria-label="正在加载关联账号">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  if (accountsQuery.error && !accounts) {
    return (
      <section className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          关联账号加载失败，请稍后重试。
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={accountsQuery.isFetching}
          onClick={() => void accountsQuery.refetch()}
        >
          重新加载
        </Button>
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
          const account = accounts?.find(
            (item) => item.providerId === provider,
          );
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
                  disabled={mutation.pending}
                >
                  解除关联
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void linkAccount(provider)}
                  disabled={mutation.pending}
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
          if (!open) {
            mutation.cancelFeedback();
            setUnlinkTarget(null);
          }
        }}
        title="解除账号关联"
        description={`确定解除 ${unlinkTarget ? (Object.entries(providerLabels).find(([id]) => id === unlinkTarget.providerId)?.[1] ?? unlinkTarget.providerId) : "该账号"} 关联吗？`}
        onOK={unlinkAccount}
        OKProps={{ children: "确认解除", disabled: mutation.pending }}
        type="danger"
      />
    </section>
  );
};

export default LinkedAccountsSettings;
/**
 * 关联账号设置组件，负责展示和管理社交登录账号。
 */
