import parse, { HTMLReactParserOptions } from "html-react-parser";
import Image from "next/image";
import { MediaEntity } from "@/packages/trpc/server/types/media.entity";
import { FancyboxClient } from "@/app/(blog)/components/FancyBox";

interface Props {
  html?: string;
  images?: MediaEntity[];
}

export function RichText({ html, images = [] }: Props) {
  if (!html) return null;

  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (domNode.type === "tag" && domNode.name === "img") {
        const { src } = domNode.attribs;
        const image = images.find((img) => img.url === src);
        if (!image) return null;
        return (
          <a key={image.key} data-fancybox="gallery" href={src}>
            <Image
              src={src}
              alt={image.name!}
              width={image.width!}
              height={image.height!}
              sizes="
              (max-width: 768px) 320px,
              846px
            "
            />
          </a>
        );
      }
    },
  };

  return <FancyboxClient>{parse(html, options)}</FancyboxClient>;
}
