"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicField } from "@/components/DynamicForm/DynamicField";
import { renderCategoryTitleByDepth } from "@/app/admin/(dashboard)/post/edit/components/category-title";
import { useFormContext, useController, useWatch } from "react-hook-form";
import type { PostEditorValues } from "@/app/admin/(dashboard)/post/edit/components/utils/post-draft";
import type { CategoryListItem } from "@/features/category/types/category.record";
import type { PhotoPickerItemProps } from "@/app/admin/(dashboard)/post/edit/components/PhotoPickerItem";
import { PostType } from "@/features/post/types/post.type";
import { postTypeOptions } from "@/app/admin/(dashboard)/post/options";
import { TagType } from "@/features/tag/types/tag.type";
import MultiTag from "@/app/admin/(dashboard)/post/edit/components/MultiTag";
import PhotoPickerItem from "@/app/admin/(dashboard)/post/edit/components/PhotoPickerItem";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";

interface PostSidebarFieldsProps {
  postId?: string;
  categories?: CategoryListItem[];
  onCreateCategory: () => void;
  photoPickerProps: PhotoPickerItemProps;
}

type PostTagFieldName =
  "galleryStyles" | "movieActors" | "movieDirectors" | "movieStyles";
function PostTagField({
  name,
  ...props
}: {
  name: PostTagFieldName;
  postId: string;
  title: string;
  type: TagType;
}) {
  const { control } = useFormContext<PostEditorValues>();
  const { field } = useController({ control, name });
  return (
    <MultiTag {...props} value={field.value ?? []} onChange={field.onChange} />
  );
}

export function PostSidebarFields({
  postId,
  categories,
  onCreateCategory,
  photoPickerProps,
}: PostSidebarFieldsProps) {
  const canCreateCategory = useCan(Permission.categoryCreate);
  const { control } = useFormContext<PostEditorValues>();
  const type = useWatch({ control, name: "type" }) ?? PostType.ARTICLE;

  return (
    <>
      <DynamicField
        label="文章类型"
        name="type"
        type="select"
        options={postTypeOptions}
      />
      <DynamicField
        label="分类目录"
        name="categoryId"
        type="select"
        placeholder="请选择"
        options={categories?.map((item) => ({
          label: renderCategoryTitleByDepth(item.title?.zh, item),
          value: item.id ?? "0",
        }))}
      />
      {canCreateCategory && (
        <Button variant="outline" type="button" onClick={onCreateCategory}>
          <Plus className="w-4 h-4 mr-1" />
          新建分类
        </Button>
      )}

      {[PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(
        type,
      ) && <PhotoPickerItem {...photoPickerProps} />}

      {type === PostType.MOVIE && (
        <>
          <DynamicField
            label="上映年代"
            name="movieTime"
            type="calendar"
            placeholder="请选择上映时间"
          />
          <PostTagField
            postId={postId ?? ""}
            title="导演"
            type={TagType.DIRECTOR}
            name="movieDirectors"
          />
          <PostTagField
            postId={postId ?? ""}
            title="演员"
            type={TagType.ACTOR}
            name="movieActors"
          />
          <PostTagField
            postId={postId ?? ""}
            title="电影风格"
            type={TagType.MOVIE_STYLE}
            name="movieStyles"
          />
        </>
      )}

      {type === PostType.PHOTOGRAPH && (
        <>
          <DynamicField
            label="拍摄地点"
            name="galleryLocation"
            type="text"
            placeholder="请填写地址"
            multiLang
          />
          <DynamicField
            label="拍摄时间"
            name="galleryTime"
            type="calendar"
            placeholder="请选择拍摄时间"
          />
          <PostTagField
            postId={postId ?? ""}
            title="照片风格"
            type={TagType.GALLERY_STYLE}
            name="galleryStyles"
          />
        </>
      )}
    </>
  );
}
/**
 * 文章编辑侧栏字段组件，负责渲染文章状态、分类和标签等辅助字段。
 */
