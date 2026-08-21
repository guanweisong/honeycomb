"use client";

import type { FormEventHandler, RefObject } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/packages/ui/components/button";
import type { CommentTreeViewModel as CommentTreeEntity } from "../../../presentation/comment-view-model";
import type { CommentIdentity } from "../hooks/use-comment-identity";

interface CommentFormProps {
  identity?: CommentIdentity;
  replyTo: CommentTreeEntity | null;
  formRef: RefObject<HTMLFormElement | null>;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancelReply: () => void;
  onClearIdentity: () => void;
}

export function CommentForm({
  identity,
  replyTo,
  formRef,
  isPending,
  onSubmit,
  onCancelReply,
  onClearIdentity,
}: CommentFormProps) {
  const t = useTranslations("Comment");

  return (
    <>
      {!!replyTo && (
        <div className="leading-10">
          <span className="text-teal-500">Reply to:</span>
          <span className="mx-2">{replyTo.author}</span>
          <a
            className="transition-all text-auto-front-gray/50"
            onClick={onCancelReply}
          >
            [{t("form.cancel")}]
          </a>
        </div>
      )}
      <form onSubmit={onSubmit} ref={formRef}>
        {identity ? (
          <div className="my-2 flex justify-between">
            <span>
              {t("welcomeBack")}: {identity.author}
            </span>
            <span className="ml-2">
              {t("notYou")}
              <a className="text-teal-500" onClick={onClearIdentity}>
                [{t("quit")}]
              </a>
            </span>
          </div>
        ) : (
          <>
            <input
              className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-teal-400 bg-transparent"
              type="text"
              placeholder={t("form.name")}
              name="author"
              maxLength={20}
              required
            />
            <input
              className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-teal-400 bg-transparent"
              type="url"
              placeholder={t("form.site")}
              name="site"
              maxLength={30}
            />
            <input
              className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-teal-400 bg-transparent"
              type="email"
              placeholder={t("form.email")}
              name="email"
              required
              maxLength={30}
            />
          </>
        )}
        <textarea
          className="block border-b-[0.5px]  border-auto-front-gray/40 w-full leading-6 pt-2 outline-0 focus:border-teal-400 mb-2 bg-transparent"
          placeholder={t("form.content")}
          name="content"
          required
          maxLength={200}
          rows={4}
        />
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {t("form.submit")}
        </Button>
      </form>
    </>
  );
}
/**
 * 评论表单组件，负责评论内容、身份信息和回复取消操作。
 */
