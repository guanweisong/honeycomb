import parse, { HTMLReactParserOptions } from "html-react-parser";
import Image from "next/image";
import type { MediaRecord as MediaEntity } from "@/features/media/types";
import { PhotoSwipeClient } from "@/components/PhotoSwipe";
import { sanitizeRichText } from "@/lib/security/sanitize-html";

interface Props {
  html?: string;
  images?: MediaEntity[];
}

export function RichText({ html, images = [] }: Props) {
  if (!html) return null;

  const imageByUrl = new Map<string, MediaEntity>();
  for (const image of images) {
    const url = image.url;
    if (!imageByUrl.has(url)) imageByUrl.set(url, image);
  }

  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (domNode.type === "tag" && domNode.name === "img") {
        const { src } = domNode.attribs;
        if (src === undefined) return null;
        const image = imageByUrl.get(src);
        if (!image || image.width == null || image.height == null) return null;
        return (
          <a
            key={image.key}
            href={src}
            data-pswp-width={image.width}
            data-pswp-height={image.height}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={image.url}
              alt={image.name}
              width={image.width}
              height={image.height}
              sizes="(max-width: 768px) 320px, 846px"
            />
          </a>
        );
      }
    },
  };

  return (
    <PhotoSwipeClient>
      {parse(sanitizeRichText(html), options)}
    </PhotoSwipeClient>
  );
}
/**
 * 富文本展示组件，负责解析并渲染经过清洗的 HTML 内容。
 */
