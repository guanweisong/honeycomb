"use client";

import React, { useRef, useState, use, useTransition, useEffect } from "react";
import { Button } from "@/packages/ui/components/button";
import Card from "../Card";
import { utcFormat } from "@/app/(blog)/libs/utcFormat";
import { CommentProps } from "./index";
import { refreshPath } from "@/app/(blog)/libs/refreshPath";
import { CommentStatus } from "@/packages/types/comment/comment.status";
import { MenuType } from "@/packages/types/menu/menu.type";
import { CommentInsertInput } from "@/packages/validation/schemas/comment/comment.insert.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import { useTranslations } from "next-intl";
import {
  CommentEntity,
  CommentResponse,
} from "@/packages/trpc/server/types/comment.entity";
import { usePathname, useRouter } from "@/app/(blog)/i18n/navigation";

/**
 * 评论客户端组件的属性接口。
 * 继承自 `CommentProps`，并增加了评论查询的 Promise。
 */
export interface CommentClientProps extends CommentProps {
  /**
   * 评论查询的 Promise，用于获取评论数据。
   */
  queryCommentPromise: Promise<CommentResponse>;
}

/**
 * 用户信息接口。
 * 用于存储评论者的基本信息。
 */
export interface User {
  /**
   * 评论作者。
   */
  author: string;
  /**
   * 评论作者的网站。
   */
  site?: string;
  /**
   * 评论作者的邮箱。
   */
  email: string;
}

/**
 * 评论客户端组件。
 * 负责评论的显示、回复、提交等交互逻辑。
 * @param {CommentClientProps} props - 组件属性。
 * @returns {JSX.Element} 评论组件。
 */
const CommentClient = (props: CommentClientProps) => {
  const { id, type, queryCommentPromise } = props;
  /**
   * 标识评论提交是否处于挂起状态。
   */
  const [isPending, startTransition] = useTransition();
  const comment = use(queryCommentPromise);

  /**
   * 存储当前回复的评论对象。
   */
  const [replyTo, setReplyTo] = useState<CommentEntity | null>(null);
  /**
   * 表单元素的引用。
   */
  const formRef = useRef<HTMLFormElement | null>(null);
  /**
   * 存储当前评论用户信息。
   */
  const [user, setUser] = useState<User>();

  const t = useTranslations("Comment");

  const router = useRouter();
  const pathname = usePathname();

  /**
   * 创建评论的 tRPC mutation。
   */
  const mutation = trpc.comment.create.useMutation();

  /**
   * 副作用钩子，用于从 localStorage 加载用户数据。
   * 在组件挂载时尝试从 localStorage 获取用户数据并设置到 `user` 状态。
   */
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  /**
   * 处理评论回复事件。
   * 设置 `replyTo` 状态，并滚动到评论表单。
   * @param {CommentEntity | null} [item] - 要回复的评论对象，如果为 `null` 则取消回复。
   */
  const handleReply = (item?: CommentEntity | null) => {
    if (item !== null) {
      window.scrollTo(0, 99999);
    }
    setReplyTo(item || null);
  };

  /**
   * 评论提交事件。
   * 收集表单数据，集成腾讯防水墙验证码，并调用 tRPC mutation 提交评论。
   * 提交成功后刷新页面，清空表单，并保存用户数据到 localStorage。
   * @param {React.FormEvent<HTMLFormElement>} e - 表单提交事件对象。
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

    const data = {
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
   * 评论列表渲染函数。
   * 递归渲染评论及其子评论，并处理评论状态显示。
   * @param {CommentEntity[]} data - 评论数据数组。
   * @returns {JSX.Element[]} 评论列表的 JSX 元素数组。
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
                <a className="text-teal-500" href={item.site}>
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
            <a className="text-teal-500" onClick={() => handleReply(item)}>
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
              <span className="text-teal-500">Reply to:</span>
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
                    className="text-teal-500"
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
