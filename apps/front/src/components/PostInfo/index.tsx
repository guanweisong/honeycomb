import { Link } from "@/i18n/navigation";
import React, { unstable_ViewTransition as ViewTransition } from "react";
import { utcFormat } from "@/utils/utcFormat";
import { useTranslations } from "next-intl";
import { cn } from "@honeycomb/ui/lib/utils";

/**
 * 对齐方式枚举。
 */
export enum Align {
  /**
   * 左对齐。
   */
  Left = "left",
  /**
   * 居中对齐。
   */
  Center = "center",
}

/**
 * 文章信息组件的属性接口。
 */
export interface PostInfoProps {
  /**
   * 文章 ID。
   */
  id?: string;
  /**
   * 文章作者。
   */
  author?: string;
  /**
   * 文章发布日期。
   */
  date?: string;
  /**
   * 评论数量。
   */
  comments?: number;
  /**
   * 浏览量。
   */
  views?: number;
  /**
   * 信息对齐方式。
   */
  align?: Align;
}

/**
 * 文章信息组件。
 * 显示文章的作者、发布日期、评论数和浏览量。
 * @param {PostInfoProps} props - 组件属性。
 * @returns {JSX.Element | null} 文章信息组件或 null。
 */
const PostInfo = (props: PostInfoProps) => {
  const { id, author, date, views, comments, align = Align.Center } = props;
  /**
   * 存储要显示的文章信息项。
   */
  const data = [];
  const t = useTranslations("PostInfo");

  if (typeof author !== "undefined") {
    data.push(
      <Link href={`/list/authors/${author}`} className="link-light">
        {author}
      </Link>,
    );
  }

  if (typeof date !== "undefined") {
    data.push(utcFormat(date));
  }

  if (typeof comments !== "undefined") {
    data.push(t("messages", { count: comments }));
  }

  if (typeof views !== "undefined") {
    data.push(t("views", { count: views }));
  }

  if (!data.length) {
    return null;
  }

  return (
    <ViewTransition name={`postInfo-${id}`}>
      <div
        className={cn(
          "flex text-sm my-2 border-dashed border-auto-front-gray/30",
          {
            "justify-center": align === Align.Center,
            "justify-start": align === Align.Left,
          },
        )}
      >
        {data.map((item, index) => (
          <span key={item.toString()}>
            {index > 0 && <span className="mx-1 text-gray-300">/</span>}
            <span>{item}</span>
          </span>
        ))}
      </div>
    </ViewTransition>
  );
};

export default PostInfo;
