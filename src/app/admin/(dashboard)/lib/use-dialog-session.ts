"use client";

import { useLayoutEffect, useRef } from "react";
import type { ModalType } from "@/app/admin/(dashboard)/types/modal-type";
import type { AdminTargetMutationState } from "@/app/admin/(dashboard)/lib/action-state";

/** 迟到的保存结果不得关闭已重开的弹窗。 */
export function useDialogSession(
  open: boolean | undefined,
  type: ModalType | undefined,
  id: string | undefined,
) {
  const generation = useRef(0);
  const invalidate = () => {
    generation.current += 1;
  };
  useLayoutEffect(
    () => () => {
      generation.current += 1;
    },
    [open, type, id],
  );

  return {
    invalidate,
    closeAfter: async (
      save: () => Promise<AdminTargetMutationState>,
      close: () => void,
    ) => {
      const started = generation.current;
      if ((await save()) === "success" && generation.current === started)
        close();
    },
  };
}
