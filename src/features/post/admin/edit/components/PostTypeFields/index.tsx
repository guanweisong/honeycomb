"use client";

import { DynamicField } from "@/components/DynamicForm/DynamicField";
import { PostType } from "@/features/post/post-type";

export function PostTypeFields({ type }: { type: PostType }) {
  if (type === PostType.QUOTE) {
    return (
      <>
        <DynamicField
          name="quoteContent"
          label="引用正文"
          type="textarea"
          placeholder="请输入话语"
          multiLang
        />
        <DynamicField
          name="quoteAuthor"
          label="引用作者"
          type="text"
          placeholder="请输入作者"
          multiLang
        />
      </>
    );
  }

  if (![PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(type)) {
    return null;
  }

  return (
    <>
      <DynamicField
        name="title"
        type="text"
        label="标题"
        placeholder="在此输入文章标题"
        multiLang
      />
      <DynamicField
        name="content"
        type="richText"
        label="内容"
        placeholder="请输入内容"
        multiLang
      />
      <DynamicField
        name="excerpt"
        type="textarea"
        label="简介"
        placeholder="内容简介"
        multiLang
      />
    </>
  );
}
/**
 * 文章类型字段组件，负责根据文章类型渲染对应编辑字段。
 */
