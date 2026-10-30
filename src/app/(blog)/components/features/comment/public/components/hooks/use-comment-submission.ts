"use client";

import { type FormEvent, type RefObject, useRef, useTransition } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/blog-navigation";
import { MenuType } from "@/features/menu/types/menu.type";
import type { CommentTreeViewModel } from "@/features/comment/presentation/comment-view-model";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  isDeterminateRejectionCode,
  readTrpcErrorCode,
} from "@/lib/trpc/client/mutation-error";
import { clientEnv } from "@/env/client";
import type { CommentIdentity } from "@/app/(blog)/components/features/comment/public/components/hooks/use-comment-identity";
import { buildCommentInput } from "@/app/(blog)/components/features/comment/public/components/utils/comment-input";
import { clientLogger } from "@/lib/observability/client";
import { LogEvent } from "@/lib/observability/core/names";
import { useTurnstileToken } from "@/lib/hooks/use-turnstile-token";

interface UseCommentSubmissionOptions {
  id: string;
  type: MenuType;
  identity?: CommentIdentity;
  replyTo: CommentTreeViewModel | null;
  formRef: RefObject<HTMLFormElement | null>;
  turnstileRef: RefObject<TurnstileInstance | null>;
  persistIdentity: (identity: CommentIdentity) => void;
  clearReply: () => void;
}

export function useCommentSubmission({
  id,
  type,
  identity,
  replyTo,
  formRef,
  turnstileRef,
  persistIdentity,
  clearReply,
}: UseCommentSubmissionOptions) {
  const {
    token: captchaToken,
    onSuccess: onCaptchaSuccess,
    reset: resetCaptcha,
  } = useTurnstileToken(turnstileRef);
  const [isPending, startTransition] = useTransition();
  const draftVersion = useRef(0);
  const onDraftChange = () => {
    draftVersion.current += 1;
  };
  const mutation = trpc.comment.create.useMutation();
  const t = useTranslations("Comment");
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error(t("captchaRequired"));
      return;
    }

    const form = event.currentTarget;
    const submittedVersion = draftVersion.current;
    const formData = new FormData(form);
    const readText = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value : "";
    };
    let submittedIdentity = identity;
    if (!submittedIdentity) {
      submittedIdentity = {
        author: readText("author"),
        email: readText("email"),
      };
      const site = readText("site");
      if (site) submittedIdentity.site = site;
    }

    const data = buildCommentInput({
      id,
      type,
      identity: submittedIdentity,
      content: readText("content"),
      captchaToken: captchaToken ?? undefined,
      parentId: replyTo?.id,
    });

    startTransition(async () => {
      try {
        const result = await mutation.mutateAsync(data);
        if (result?.id) {
          router.refresh();
          // 旧请求不能清空等待期间的新输入、身份选择或回复目标。
          if (
            formRef.current === form &&
            draftVersion.current === submittedVersion
          ) {
            clearReply();
            form.reset();
            persistIdentity(submittedIdentity);
          }
        }
      } catch (error) {
        toast.error(
          t(
            isDeterminateRejectionCode(readTrpcErrorCode(error))
              ? "submitRejected"
              : "submitUnknown",
          ),
        );
        clientLogger.error(LogEvent.clientError, {
          operation: "comment.submit",
          outcome: "error",
        });
      } finally {
        resetCaptcha();
      }
    });
  };

  return {
    handleSubmit,
    onDraftChange,
    onCaptchaSuccess,
    resetCaptcha,
    isPending: isPending || mutation.isPending,
  };
}
/**
 * 评论提交 Hook，负责组装输入、调用 Mutation、刷新页面和处理验证码。
 */
