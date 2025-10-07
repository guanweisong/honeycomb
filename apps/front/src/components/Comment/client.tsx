"use client";

import React, { useRef, useState, use, useTransition, useEffect } from "react";
import { Button } from "@honeycomb/ui/components/button";
import Card from "../Card";
import { utcFormat } from "@/utils/utcFormat";
import { CommentProps } from "./index";
import PaginationResponse from "@/types/pagination.response";
import { useRouter, usePathname } from "next/navigation";
import { refreshPath } from "@/utils/refreshPath";
import { useTranslations } from "next-intl";
import { CommentStatus, MenuType } from "@honeycomb/db";
import { CommentEntity } from "@honeycomb/validation/comment/schemas/comment.entity.schema";
import { CommentInsertInput } from "@honeycomb/validation/comment/schemas/comment.insert.schema";
import { trpc } from "@honeycomb/trpc/client/trpc"; // ✅ 客户端 tRPC

export interface CommentClientProps extends CommentProps {
  queryCommentPromise: Promise<PaginationResponse<CommentEntity>>;
}

export interface User {
  author: string;
  site?: string;
  email: string;
}

const CommentClient = (props: CommentClientProps) => {
  const { id, type, queryCommentPromise } = props;
  const [isPending, startTransition] = useTransition();
  const comment = use(queryCommentPromise);
  const [replyTo, setReplyTo] = useState<CommentEntity | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Comment");
  const [user, setUser] = useState<User>();

  // ✅ 使用 trpc 客户端 mutation
  const mutation = trpc.comment.create.useMutation();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  /**
   * 评论回复事件
   */
  const handleReply = (item?: CommentEntity | null) => {
    if (item !== null) {
      window.scrollTo(0, 99999);
    }
    setReplyTo(item || null);
  };

  /**
   * 评论提交事件（改为 trpc 客户端调用）
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    let userData = user;

    if (!userData) {
      userData = {
        author: form.author.value,
        email: form.email.value,
      } as User;
      const site = form.site.value;
      if (site) {
        userData.site = site;
      }
    }

    const data: CommentInsertInput = {
      ...userData,
      content: form.content.value,
    } as CommentInsertInput;

    switch (type) {
      case MenuType.CATEGORY:
        data.postId = id;
        break;
      case MenuType.PAGE:
        data.pageId = id;
        break;
      case MenuType.CUSTOM:
        data.customId = id;
        break;
    }

    const captcha = new TencentCaptcha("2090829333", async (res: any) => {
      if (res.ret === 0) {
        data.captcha = {
          ticket: res.ticket,
          randstr: res.randstr,
        };
        if (replyTo !== null) {
          data.parentId = replyTo.id;
        }

        console.log("handleSubmit", data);
        startTransition(async () => {
          try {
            const result = await mutation.mutateAsync(data); // ✅ 改为 trpc 客户端调用
            if (result?.id) {
              await refreshPath(pathname);
              router.refresh();
              handleReply(null);
              formRef.current?.reset();
              localStorage.setItem("user", JSON.stringify(userData));
              setUser(userData);
            }
          } catch (error) {
            console.error("Comment submit failed:", error);
          }
        });
      }
    });
    captcha?.show();
  };

  /**
   * 评论列表渲染
   */
  const renderCommentList = (data: CommentEntity[]) => {
    return data?.map((item) => (
      <li className="relative" key={item.id}>
        <div className="overflow-hidden py-4 border-b-0.5 border-dashed border-auto-front-gray/50">
          <div className="float-left w-12 h-12 mr-5">
            <img src={item.avatar} className="w-full" />
          </div>
          <div className="overflow-hidden">
            <div>
              {item.site ? (
                <a className="text-pink-500" href={item.site}>
                  {item.author}
                </a>
              ) : (
                item.author
              )}
            </div>
            <div className="mt-1 whitespace-pre-wrap">
              {item.status !== CommentStatus.BAN
                ? item.content
                : t("banMessage")}
            </div>
          </div>
          <div className="absolute right-2 top-4 text-auto-front-gray/50">
            <span>{utcFormat(item.createdAt)}</span>
            <span className="mx-1">/</span>
            <a className="text-pink-500" onClick={() => handleReply(item)}>
              {t("form.reply")}
            </a>
          </div>
        </div>
        {item.children.length > 0 && (
          <ul className="ml-10">{renderCommentList(item.children)}</ul>
        )}
      </li>
    ));
  };

  return (
    <div>
      {comment && comment.total !== 0 && (
        <Card title={t("summary", { count: comment.total })}>
          <ul>{renderCommentList(comment.list)}</ul>
        </Card>
      )}
      <Card title={t("title")}>
        <>
          {!!replyTo && (
            <div className="leading-10">
              <span className="text-pink-500">Reply to:</span>
              <span className="mx-2">{replyTo?.author}</span>
              <a
                className="transition-all text-auto-front-gray/50"
                onClick={() => handleReply(null)}
              >
                [{t("form.cancel")}]
              </a>
            </div>
          )}
          <form onSubmit={handleSubmit} ref={formRef}>
            {user ? (
              <div className="my-2 flex justify-between">
                <span>
                  {t("welcomeBack")}: {user.author}
                </span>
                <span className="ml-2">
                  {t("notYou")}
                  <a
                    className="text-pink-500"
                    onClick={() => {
                      setUser(undefined);
                      localStorage.removeItem("user");
                    }}
                  >
                    [{t("quit")}]
                  </a>
                </span>
              </div>
            ) : (
              <>
                <input
                  className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-pink-400 bg-transparent"
                  type="text"
                  placeholder={t("form.name")}
                  name="author"
                  maxLength={20}
                  required
                />
                <input
                  className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-pink-400 bg-transparent"
                  type="url"
                  placeholder={t("form.site")}
                  name="site"
                  maxLength={30}
                />
                <input
                  className="block border-b-[0.5px] border-auto-front-gray/40 w-full leading-10 outline-0 focus:border-pink-400 bg-transparent"
                  type="email"
                  placeholder={t("form.email")}
                  name="email"
                  required
                  maxLength={30}
                />
              </>
            )}

            <textarea
              className="block border-b-[0.5px]  border-auto-front-gray/40 w-full leading-6 pt-2 outline-0 focus:border-pink-400 mb-2 bg-transparent"
              placeholder={t("form.content")}
              name="content"
              required
              maxLength={200}
              rows={4}
            />
            <Button
              type="submit"
              disabled={isPending || mutation.isPending}
              className="cursor-pointer"
            >
              {t("form.submit")}
            </Button>
          </form>
        </>
      </Card>
    </div>
  );
};

export default CommentClient;
