"use client";

import { use, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { clientEnv } from "@/env/client";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import Card from "@/packages/ui/blog/Card";
import type { CommentProps } from "../index";
import type {
  CommentTreeViewModel as CommentTreeEntity,
  CommentTreeViewResponse as CommentTreeResponse,
} from "../../../presentation/comment-view-model";
import { CommentForm } from "../CommentForm";
import { CommentTree } from "../CommentTree";
import { useCommentIdentity } from "../hooks/use-comment-identity";
import { useCommentSubmission } from "../hooks/use-comment-submission";

export interface CommentClientProps extends CommentProps {
  queryCommentPromise: Promise<CommentTreeResponse>;
}

const CommentClient = ({
  id,
  type,
  queryCommentPromise,
}: CommentClientProps) => {
  const comment = use(queryCommentPromise);
  const [replyTo, setReplyTo] = useState<CommentTreeEntity | null>(null);
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

  const handleReply = (item: CommentTreeEntity) => {
    window.scrollTo(0, 99999);
    setReplyTo(item);
  };

  return (
    <div>
      {comment && comment.total !== 0 && (
        <Card title={t("summary", { count: comment.total })}>
          <ul>
            <CommentTree comments={comment.list} onReply={handleReply} />
          </ul>
        </Card>
      )}
      <Card title={t("title")}>
        <CommentForm
          identity={identity}
          replyTo={replyTo}
          formRef={formRef}
          isPending={submission.isPending}
          onSubmit={submission.handleSubmit}
          onCancelReply={() => setReplyTo(null)}
          onClearIdentity={clearIdentity}
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
