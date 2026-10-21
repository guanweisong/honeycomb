"use client";

import { useId, type FormEventHandler, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { CommentTreeViewModel } from "../../../presentation/comment-view-model";
import type { CommentIdentity } from "../hooks/use-comment-identity";

interface CommentFormProps {
  identity?: CommentIdentity;
  replyTo: CommentTreeViewModel | null;
  formRef: RefObject<HTMLFormElement | null>;
  isPending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onDraftChange: () => void;
  onCancelReply: () => void;
  onClearIdentity: () => void;
}

export function CommentForm({
  identity,
  replyTo,
  formRef,
  isPending,
  onSubmit,
  onDraftChange,
  onCancelReply,
  onClearIdentity,
}: CommentFormProps) {
  const t = useTranslations("Comment");
  const fieldId = useId();
  const mounted = useMounted();

  return (
    <>
      {!!replyTo && (
        <div className="leading-10">
          <span className="text-teal-500">Reply to:</span>
          <span className="mx-2">{replyTo.author}</span>
          <button
            type="button"
            className="transition-all text-auto-front-gray/50 focus-visible:outline-2 focus-visible:outline-teal-500"
            onClick={onCancelReply}
          >
            [{t("form.cancel")}]
          </button>
        </div>
      )}
      <form onSubmit={onSubmit} onInput={onDraftChange} ref={formRef}>
        {identity ? (
          <div className="my-2 flex justify-between">
            <span>
              {t("welcomeBack")}: {identity.author}
            </span>
            <span className="ml-2">
              {t("notYou")}
              <button
                type="button"
                className="text-teal-500 focus-visible:outline-2 focus-visible:outline-teal-500"
                onClick={onClearIdentity}
              >
                [{t("quit")}]
              </button>
            </span>
          </div>
        ) : (
          <>
            <label className="sr-only" htmlFor={`${fieldId}-author`}>
              {t("form.name")}
            </label>
            <input
              id={`${fieldId}-author`}
              className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-teal-400 bg-transparent"
              type="text"
              placeholder={t("form.name")}
              name="author"
              maxLength={20}
              required
            />
            <label className="sr-only" htmlFor={`${fieldId}-site`}>
              {t("form.site")}
            </label>
            <input
              id={`${fieldId}-site`}
              className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-teal-400 bg-transparent"
              type="url"
              placeholder={t("form.site")}
              name="site"
              maxLength={200}
            />
            <label className="sr-only" htmlFor={`${fieldId}-email`}>
              {t("form.email")}
            </label>
            <input
              id={`${fieldId}-email`}
              className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-teal-400 bg-transparent"
              type="email"
              placeholder={t("form.email")}
              name="email"
              required
              maxLength={254}
            />
          </>
        )}
        <label className="sr-only" htmlFor={`${fieldId}-content`}>
          {t("form.content")}
        </label>
        <textarea
          id={`${fieldId}-content`}
          className="block border-b-[0.5px]  border-auto-front-gray/40 w-full leading-6 pt-2 outline-0 focus:border-teal-400 mb-2 bg-transparent"
          placeholder={t("form.content")}
          name="content"
          required
          maxLength={200}
          rows={4}
        />
        <Button
          type="submit"
          disabled={!mounted || isPending}
          className="cursor-pointer"
        >
          {t("form.submit")}
        </Button>
      </form>
    </>
  );
}
/**
 * 评论表单组件，负责评论内容、身份信息和回复取消操作。
 */
