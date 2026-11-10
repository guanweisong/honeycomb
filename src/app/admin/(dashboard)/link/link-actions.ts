"use client";

import type { LinkInsert } from "@/features/link/types/link.insert";
import type { LinkUpdate } from "@/features/link/types/link.update";
import type { LinkRecord as LinkEntity } from "@/features/link/types/link.record";
import { useAdminRecordActions } from "@/app/admin/(dashboard)/lib/use-admin-record-actions";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  runAdminMutation,
  withAdminRecordId,
  type AdminDialogState,
  type AdminListActionOptions,
  type AdminMutationFeedback,
  type AdminTargetMutationState,
} from "@/app/admin/(dashboard)/lib/action-state";

export type LinkDialogState = AdminDialogState<LinkEntity>;

type SubmitLinkUpdateOptions = AdminMutationFeedback & {
  record?: LinkEntity;
  values: LinkUpdate;
  update: (input: LinkUpdate) => Promise<unknown>;
};

export async function submitLinkUpdate({
  record,
  values,
  update,
  refetch,
  notifySuccess,
  notifyWarning,
  notifyError,
}: SubmitLinkUpdateOptions): Promise<AdminTargetMutationState> {
  if (!record?.id) {
    notifyError("缺少记录ID");
    return "missing-target";
  }

  return runAdminMutation({
    input: withAdminRecordId(record, values),
    mutate: update,
    refetch,
    notifySuccess,
    notifyWarning,
    notifyError,
    successMessage: "更新成功",
    errorMessage: "更新失败",
  });
}

export function useLinkActions(options: AdminListActionOptions<LinkEntity>) {
  const create = trpc.link.create.useMutation();
  const update = trpc.link.update.useMutation();
  const destroy = trpc.link.destroy.useMutation();
  return useAdminRecordActions<LinkEntity, LinkInsert, LinkUpdate>(options, {
    create: create.mutateAsync,
    update: (record, values, feedback) =>
      submitLinkUpdate({
        ...feedback,
        record,
        values,
        update: update.mutateAsync,
      }),
    destroy: destroy.mutateAsync,
  });
}
