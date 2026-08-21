"use client";

import { type FormEvent, type RefObject, useState, useTransition } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  usePathname,
  useRouter,
} from "@/packages/ui/navigation/blog-navigation";
import { refreshPath } from "@/packages/infrastructure/refresh-path";
import { MenuType } from "@/packages/domain/navigation/menu";
import type { CommentTreeViewModel as CommentTreeEntity } from "../../../presentation/comment-view-model";
import { trpc } from "@/packages/trpc/client/trpc";
import { clientEnv } from "@/env/client";
import type { CommentIdentity } from "./use-comment-identity";
import { buildCommentInput } from "../utils/comment-input";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";

interface UseCommentSubmissionOptions {
  id: string;
  type: MenuType;
  identity?: CommentIdentity;
  replyTo: CommentTreeEntity | null;
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mutation = trpc.comment.create.useMutation();
  const t = useTranslations("Comment");
  const router = useRouter();
  const pathname = usePathname();

  const resetCaptcha = () => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error(t("captchaRequired"));
      return;
    }

    const form = event.currentTarget;
    let submittedIdentity = identity;
    if (!submittedIdentity) {
      submittedIdentity = {
        author: form.author.value,
        email: form.email.value,
      };
      const site = form.site.value;
      if (site) submittedIdentity.site = site;
    }

    const data = buildCommentInput({
      id,
      type,
      identity: submittedIdentity,
      content: form.content.value,
      captchaToken: captchaToken ?? undefined,
      parentId: replyTo?.id,
    });

    startTransition(async () => {
      mutation
        .mutateAsync(data)
        .then(async (result) => {
          if (result?.id) {
            await refreshPath(pathname);
            router.refresh();
            clearReply();
            formRef.current?.reset();
            persistIdentity(submittedIdentity);
          }
        })
        .catch(() => {
          clientLogger.error(LogEvent.clientError, {
            operation: "comment.submit",
            outcome: "error",
          });
        })
        .finally(resetCaptcha);
    });
  };

  return {
    handleSubmit,
    onCaptchaSuccess: setCaptchaToken,
    resetCaptcha,
    isPending: isPending || mutation.isPending,
  };
}
/**
 * 评论提交 Hook，负责组装输入、调用 Mutation、刷新页面和处理验证码。
 */
