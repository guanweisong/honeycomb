"use client";

import type { UserInsert } from "@/features/user/types/user.insert";
import type { UserUpdate } from "@/features/user/types/user.update";
import type { UserRecord as UserEntity } from "@/features/user/types/user.record";
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

export type UserDialogState = AdminDialogState<UserEntity>;

type SubmitUserUpdateOptions = AdminMutationFeedback & {
  record?: UserEntity;
  values: UserUpdate;
  update: (input: UserUpdate) => Promise<unknown>;
};

export async function submitUserUpdate({
  record,
  values,
  update,
  refetch,
  notifySuccess,
  notifyWarning,
  notifyError,
}: SubmitUserUpdateOptions): Promise<AdminTargetMutationState> {
  if (!record?.id) {
    notifyError("缺少用户ID");
    return "missing-target";
  }

  const { name, ...remainingValues } = values;
  // The form resolver trims names; legacy stored display names may not be trimmed.
  const patch =
    name === undefined || name.trim() === record.name?.trim()
      ? remainingValues
      : values;

  return runAdminMutation({
    input: withAdminRecordId(record, patch),
    mutate: update,
    refetch,
    notifySuccess,
    notifyWarning,
    notifyError,
    successMessage: "更新成功",
    errorMessage: "更新失败",
  });
}

export function useUserActions(options: AdminListActionOptions<UserEntity>) {
  const create = trpc.user.create.useMutation();
  const update = trpc.user.update.useMutation();
  const destroy = trpc.user.destroy.useMutation();
  return useAdminRecordActions<UserEntity, UserInsert, UserUpdate>(options, {
    create: create.mutateAsync,
    update: (record, values, feedback) =>
      submitUserUpdate({
        ...feedback,
        record,
        values,
        update: update.mutateAsync,
      }),
    destroy: destroy.mutateAsync,
  });
}
