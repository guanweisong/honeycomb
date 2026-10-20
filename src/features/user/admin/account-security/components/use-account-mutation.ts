"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** Local UI lifetime guard only. BetterAuth remains responsible for mutation semantics. */
export function useAccountMutation() {
  const mounted = useRef(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, []);

  const cancelFeedback = () => {
    generation.current += 1;
  };
  const run = async ({
    mutate,
    failure,
    success,
    committed,
    refresh,
  }: {
    mutate: () => Promise<{ error?: { message?: string | null } | null }>;
    failure: string;
    success?: string;
    committed?: () => void;
    refresh?: () => Promise<unknown>;
  }) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    const started = generation.current;
    const current = () => mounted.current && generation.current === started;
    try {
      let result;
      try {
        result = await mutate();
      } catch {
        if (current())
          toast.error(
            "无法确认操作是否完成，请先检查账号状态，不要直接重复提交。",
          );
        return false;
      }
      if (!current()) return false;
      if (result.error) {
        toast.error(result.error.message || failure);
        return false;
      }
      committed?.();
      if (success) toast.success(success);
      if (refresh) {
        try {
          await refresh();
        } catch {
          if (current())
            toast.warning(
              "操作已完成，但列表刷新失败。请刷新页面核对，不要重复操作。",
            );
        }
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
    // Controlled dialogs close on confirmed commit, never via a late shared-dialog callback.
    return false;
  };
  return { run, pending, cancelFeedback };
}
