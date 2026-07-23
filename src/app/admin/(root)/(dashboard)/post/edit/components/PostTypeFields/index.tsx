"use client";

import { DynamicField } from "@/packages/ui/extended/DynamicForm/DynamicField";
import { PostType } from "@/packages/trpc/api/modules/post/types/post.type";

export function PostTypeFields({ type }: { type: PostType }) {
  if (type === PostType.QUOTE) {
    return (
      <>
        <DynamicField
          name="quoteContent"
          type="textarea"
          placeholder="请输入话语"
          multiLang
        />
        <DynamicField
          name="quoteAuthor"
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
