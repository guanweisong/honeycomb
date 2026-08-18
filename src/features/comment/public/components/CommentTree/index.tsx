"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { utcFormat } from "@/packages/ui/blog/utc-format";
import { CommentStatus } from "@/packages/domain/content/comment";
import type { CommentTreeEntity } from "@/packages/trpc/api/outputs";

interface CommentTreeProps {
  comments: CommentTreeEntity[];
  onReply: (comment: CommentTreeEntity) => void;
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: CommentTreeEntity;
  onReply: (comment: CommentTreeEntity) => void;
}) {
  const t = useTranslations("Comment");
  const avatar =
    "avatar" in comment && typeof comment.avatar === "string" && comment.avatar
      ? comment.avatar
      : "/logo.jpg";
  const children =
    "children" in comment && Array.isArray(comment.children)
      ? (comment.children as CommentTreeEntity[])
      : [];

  return (
    <li className="relative">
      <div className="overflow-hidden py-4 border-b-0.5 border-dashed border-auto-front-gray/50">
        <div className="float-left w-12 h-12 mr-5">
          <Image
            src={avatar}
            alt={t("avatarAlt", { name: comment.author })}
            width={48}
            height={48}
            className="h-12 w-12"
          />
        </div>
        <div className="overflow-hidden">
          <div>
            {comment.site ? (
              <a
                className="text-teal-500"
                href={comment.site}
                rel="nofollow noopener noreferrer"
                target="_blank"
              >
                {comment.author}
              </a>
            ) : (
              comment.author
            )}
          </div>
          <div className="mt-1 whitespace-pre-wrap">
            {comment.status !== CommentStatus.BAN
              ? comment.content
              : t("banMessage")}
          </div>
        </div>
        <div className="absolute right-2 top-4 text-auto-front-gray/50">
          <span>{utcFormat(comment.createdAt || "")}</span>
          <span className="mx-1">/</span>
          <a className="text-teal-500" onClick={() => onReply(comment)}>
            {t("form.reply")}
          </a>
        </div>
      </div>
      {children.length > 0 && (
        <ul className="ml-10">
          <CommentTree comments={children} onReply={onReply} />
        </ul>
      )}
    </li>
  );
}

export function CommentTree({ comments, onReply }: CommentTreeProps) {
  return comments.map((comment) => (
    <CommentItem key={comment.id} comment={comment} onReply={onReply} />
  ));
}
/**
 * 评论树组件，负责递归展示评论及回复入口。
 */
