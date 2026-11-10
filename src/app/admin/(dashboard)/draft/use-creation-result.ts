import { useQuery } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "@/lib/trpc/client/trpc";

export function useCreationResult(
  kind: "post" | "page",
  token: string | undefined,
  actorId: string | undefined,
  readReceipt: (actorId: string, token: string) => unknown,
) {
  const utils = trpc.useUtils();
  // A render after an account change can still hold the previous receipt.
  const input = {
    creationToken: actorId && token && readReceipt(actorId, token) ? token : "",
  };
  return useQuery({
    queryKey: getQueryKey(trpc[kind].creationResult, input, "query"),
    queryFn: async () => {
      const data = await utils.client[kind].creationResult.query(input);
      // Refresh lists even when the editor unmounts before confirmation.
      if (data) void utils[kind].adminIndex.invalidate().catch(() => {});
      return data;
    },
    enabled: Boolean(input.creationToken),
    retry: false,
  });
}
