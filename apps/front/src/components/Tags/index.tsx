import React from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PostEntity } from "@honeycomb/validation/post/schemas/post.entity.schema";
import { TagEntity } from "@honeycomb/validation/tag/schemas/tag.entity.schema";
import { MultiLang } from "@honeycomb/db";

const Tag = (props: PostEntity) => {
  const t = useTranslations("Tag");
  const locale = useLocale() as keyof MultiLang;

  const getTags = (item: TagEntity[] | undefined, label: string) => {
    if (item && item.length > 0) {
      return (
        <li>
          <span>{label}：</span>
          {item.map((n, index) => {
            return (
              <span key={n.id}>
                {index !== 0 && "、"}
                <Link
                  // @ts-ignore
                  href={`/list/tags/${encodeURI(n.name[locale])}`}
                  className="link-light"
                >
                  {n.name[locale]}
                </Link>
              </span>
            );
          })}
        </li>
      );
    }
  };

  return (
    <div className="list-none">
      {getTags(props.movieDirectors, t("directors"))}
      {getTags(props.movieActors, t("actors"))}
      {getTags(props.movieStyles, t("styles"))}
      {getTags(props.galleryStyles, t("styles"))}
    </div>
  );
};

export default Tag;
