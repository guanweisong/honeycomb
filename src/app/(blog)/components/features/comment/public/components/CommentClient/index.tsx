"use client";

import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { clientEnv } from "@/env/client";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import Card from "@/components/SectionCard";
import type { MenuType } from "@/features/menu/types/menu.type";
import type {
  CommentTreeViewModel,
  CommentTreeViewResponse,
} from "@/features/comment/presentation/comment-view-model";
import { CommentForm } from "@/app/(blog)/components/features/comment/public/components/CommentForm";
import { CommentTree } from "@/app/(blog)/components/features/comment/public/components/CommentTree";
import { useCommentIdentity } from "@/app/(blog)/components/features/comment/public/components/hooks/use-comment-identity";
import { useCommentSubmission } from "@/app/(blog)/components/features/comment/public/components/hooks/use-comment-submission";

/** 评论交互入口，消费详情页与计数共用的请求级查询。 */
export interface CommentClientProps {
  id: string;
  type: MenuType;
  comments: CommentTreeViewResponse;
}

function CommentListContent({
  comments,
  onReply,
}: {
  comments: CommentTreeViewResponse;
  onReply: (comment: CommentTreeViewModel, trigger: HTMLButtonElement) => void;
}) {
  const t = useTranslations("Comment");

  if (comments.total === 0) return null;

  return (
    <Card title={t("summary", { count: comments.total })}>
      <ul>
        <CommentTree comments={comments.list} onReply={onReply} />
      </ul>
    </Card>
  );
}

const CommentClient = ({ id, type, comments }: CommentClientProps) => {
  const [replyTo, setReplyTo] = useState<CommentTreeViewModel | null>(null);
  const replyTrigger = useRef<HTMLButtonElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const t = useTranslations("Comment");
  const { identity, persistIdentity, clearIdentity } = useCommentIdentity();
  const submission = useCommentSubmission({
    id,
    type,
    identity,
    replyTo,
    formRef,
    turnstileRef,
    persistIdentity,
    clearReply: () => setReplyTo(null),
  });

  const focusCommentInput = () =>
    formRef.current?.querySelector("textarea")?.focus();

  const handleReply = (
    item: CommentTreeViewModel,
    trigger: HTMLButtonElement,
  ) => {
    replyTrigger.current = trigger;
    focusCommentInput();
    submission.onDraftChange();
    setReplyTo(item);
  };

  return (
    <div>
      <CommentListContent comments={comments} onReply={handleReply} />
      <Card title={t("title")}>
        <CommentForm
          identity={identity}
          replyTo={replyTo}
          formRef={formRef}
          isPending={submission.isPending}
          onSubmit={submission.handleSubmit}
          onDraftChange={submission.onDraftChange}
          onCancelReply={() => {
            submission.onDraftChange();
            setReplyTo(null);
            if (replyTrigger.current?.isConnected) replyTrigger.current.focus();
            else focusCommentInput();
            replyTrigger.current = null;
          }}
          onClearIdentity={() => {
            submission.onDraftChange();
            clearIdentity();
          }}
        />
      </Card>
      {clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
        <Turnstile
          ref={turnstileRef}
          siteKey={clientEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={submission.onCaptchaSuccess}
          onExpire={submission.resetCaptcha}
        />
      ) : null}
    </div>
  );
};

export default CommentClient;
/**
 * Comment 客户端组件，负责评论展示、回复交互、身份状态和验证码提交。
 */
