import React from "react";
import { Link } from "@/packages/ui/navigation/blog-navigation";
import { useLocale, useTranslations } from "next-intl";
import type {
  PostListViewModel as PostListItemEntity,
  TagViewModel as TagEntity,
} from "@/features/contracts";
import { MultiLang } from "@/packages/domain/localization/multi-lang";

/**
 * 标签组件。
 * 用于显示文章相关的标签，如导演、演员、风格等，并提供跳转到对应标签列表页面的链接。
 * @param {PostListItemEntity} props - 包含文章详情的属性。
 * @returns {JSX.Element} 标签列表。
 */
const Tag = (props: PostListItemEntity) => {
  const t = useTranslations("Tag");
  const locale = useLocale() as keyof MultiLang;

  /**
   * 渲染标签列表。
   * @param {TagEntity[] | undefined} item - 标签实体数组。
   * @param {string} label - 标签组的标题。
   * @returns {JSX.Element | undefined} 渲染后的标签列表项或 undefined。
   */
  const getTags = (item: TagEntity[] | undefined, label: string) => {
    if (item && item.length > 0) {
      return (
        <li>
          <span>{label}：</span>
          {item.map((n, index) => {
            return (
              <span key={n.id}>
                {index !== 0 && "、"}
                <Link href={`/list/tags/${n.id}`} className="link-light">
                  {n.name?.[locale]}
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
