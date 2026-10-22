"use client";

import { Suspense, use, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { clientEnv } from "@/env/client";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import Card from "@/components/SectionCard";
import LoadingState from "@/components/LoadingState";
import type { MenuType } from "@/features/menu/types/menu.type";
import type {
  CommentTreeViewModel,
  CommentTreeViewResponse,
} from "../../../presentation/comment-view-model";
import { CommentForm } from "../CommentForm";
import { CommentTree } from "../CommentTree";
import { useCommentIdentity } from "../hooks/use-comment-identity";
import { useCommentSubmission } from "../hooks/use-comment-submission";

/** 评论交互入口，消费详情页与计数共用的请求级查询。 */
export interface CommentClientProps {
  id: string;
  type: MenuType;
  queryCommentPromise: Promise<CommentTreeViewResponse>;
}

function CommentListContent({
  queryCommentPromise,
  onReply,
}: {
  queryCommentPromise: Promise<CommentTreeViewResponse>;
  onReply: (comment: CommentTreeViewModel) => void;
}) {
  const comment = use(queryCommentPromise);
  const t = useTranslations("Comment");

  if (!comment || comment.total === 0) return null;

  return (
    <Card title={t("summary", { count: comment.total })}>
      <ul>
        <CommentTree comments={comment.list} onReply={onReply} />
      </ul>
    </Card>
  );
}

const CommentClient = ({
  id,
  type,
  queryCommentPromise,
}: CommentClientProps) => {
  const [replyTo, setReplyTo] = useState<CommentTreeViewModel | null>(null);
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

  const handleReply = (item: CommentTreeViewModel) => {
    window.scrollTo(0, 99999);
    submission.onDraftChange();
    setReplyTo(item);
  };

  return (
    <div>
      <Suspense fallback={<LoadingState variant="region" />}>
        <CommentListContent
          queryCommentPromise={queryCommentPromise}
          onReply={handleReply}
        />
      </Suspense>
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
