import Image from "next/image";
import ReactMarkdown from "react-markdown";
import React from "react";
import { MediaEntity } from "@/src/types/media/media.entity";

export interface MarkDownProps {
  children?: string;
  imagesInContent?: MediaEntity[];
}

const Markdown = (props: MarkDownProps) => {
  const { children = "", imagesInContent = [] } = props;
  return (
    <ReactMarkdown
      children={children}
      components={{
        img(c: React.ComponentProps<"img">) {
          const currentMedia = imagesInContent.find(
            (item) => item.url === c.src,
          );
          return (
            <Image
              priority={true}
              src={c.src!}
              alt={currentMedia?.name!}
              width={currentMedia?.width}
              height={currentMedia?.height}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 100vw, 33vw"
            />
          );
        },
      }}
    />
  );
};

export default Markdown;
