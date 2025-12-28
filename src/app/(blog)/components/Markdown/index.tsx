import Image from "next/image";
import ReactMarkdown from "react-markdown";
import React from "react";
import { MediaEntity } from "@/packages/trpc/server/types/media.entity";

/**
 * Markdown 组件的属性接口。
 */
export interface MarkDownProps {
  /**
   * Markdown 格式的文本内容。
   */
  children?: string;
  /**
   * 内容中包含的图片媒体实体列表。
   */
  imagesInContent?: MediaEntity[];
}

/**
 * Markdown 渲染组件。
 * 使用 `react-markdown` 库渲染 Markdown 内容，并自定义图片渲染方式。
 * @param {MarkDownProps} props - 组件属性。
 * @returns {JSX.Element} 渲染后的 Markdown 内容。
 */
const Markdown = (props: MarkDownProps) => {
  const { children = "", imagesInContent = [] } = props;
  return (
    <ReactMarkdown
      children={children}
      components={{
        img(c: React.ComponentProps<"img">) {
          /**
           * 自定义图片渲染组件。
           * 根据图片 URL 查找对应的媒体实体，并使用 `next/image` 进行优化渲染。
           */
          const currentMedia = imagesInContent.find(
            (item) => item.url === c.src,
          );
          return (
            <Image
              priority={true}
              src={c.src as string}
              alt={currentMedia?.name!}
              width={currentMedia?.width!}
              height={currentMedia?.height!}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 100vw, 33vw"
            />
          );
        },
      }}
    />
  );
};

export default Markdown;
