import { useQuery } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc/client/trpc";
import { readPostCreationAttempt } from "@/app/admin/(dashboard)/post/edit/components/utils/post-draft";

export function usePostCreationResult(
  creationToken: string,
  actorId: string | undefined,
  enabled: boolean,
) {
  const utils = trpc.useUtils();
  // 切换账户的首帧可能仍保留旧账户的创建凭据，不能据此发起查询。
  const ownedToken =
    actorId && readPostCreationAttempt(actorId)?.creationToken === creationToken
      ? creationToken
      : "";
  const input = { creationToken: ownedToken };
  return useQuery({
    queryKey: getQueryKey(trpc.post.creationResult, input, "query"),
    queryFn: async () => {
      const data = await utils.client.post.creationResult.query(input);
      // 查询可在编辑器卸载后完成；刷新失败不能改变已确认的创建结果。
      if (data) void utils.post.adminIndex.invalidate().catch(() => {});
      return data;
    },
    enabled: enabled && Boolean(ownedToken),
    retry: false,
  });
}
