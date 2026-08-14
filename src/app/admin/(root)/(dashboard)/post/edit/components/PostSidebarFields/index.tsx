"use client";

import { Plus } from "lucide-react";
import { Button } from "@/packages/ui/components/button";
import { DynamicField } from "@/packages/ui/extended/DynamicForm/DynamicField";
import { creatCategoryTitleByDepth } from "@/app/admin/lib/help";
import { ModalType } from "@/app/admin/types/ModalType";
import {
  PostType,
  postTypeOptions,
} from "@/packages/domain/content/post";
import { TagType } from "@/packages/domain/content/tag";
import MultiTag from "../MultiTag";
import PhotoPickerItem from "../PhotoPickerItem";
import type { usePostEditor } from "../../hooks/usePostEditor";
import { Permission } from "@/packages/identity/auth/permissions";
import { useCan } from "@/app/admin/hooks/useCurrentUser";

type Editor = ReturnType<typeof usePostEditor>;

interface PostSidebarFieldsProps {
  editor: Pick<
    Editor,
    | "category"
    | "detail"
    | "galleryStyles"
    | "movieActors"
    | "movieDirectors"
    | "movieStyles"
    | "photoPickerProps"
    | "setGalleryStyles"
    | "setModalProps"
    | "setMovieActors"
    | "setMovieDirectors"
    | "setMovieStyles"
    | "type"
  >;
}

export function PostSidebarFields({ editor }: PostSidebarFieldsProps) {
  const canCreateCategory = useCan(Permission.categoryCreate);
  const {
    category,
    detail,
    galleryStyles,
    movieActors,
    movieDirectors,
    movieStyles,
    photoPickerProps,
    setGalleryStyles,
    setModalProps,
    setMovieActors,
    setMovieDirectors,
    setMovieStyles,
    type,
  } = editor;

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
        options={category?.list?.map((item) => ({
          label: creatCategoryTitleByDepth(item.title?.zh, item),
          value: item.id ?? "0",
        }))}
      />
      {canCreateCategory && (
        <Button
          variant="outline"
          type="button"
          onClick={() => setModalProps({ open: true, type: ModalType.ADD })}
        >
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
          <MultiTag
            postId={detail?.id || ""}
            title="导演"
            type={TagType.DIRECTOR}
            value={movieDirectors}
            onChange={setMovieDirectors}
          />
          <MultiTag
            postId={detail?.id || ""}
            title="演员"
            type={TagType.ACTOR}
            value={movieActors}
            onChange={setMovieActors}
          />
          <MultiTag
            postId={detail?.id || ""}
            title="电影风格"
            type={TagType.MOVIE_STYLE}
            value={movieStyles}
            onChange={setMovieStyles}
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
          <MultiTag
            postId={detail?.id || ""}
            title="照片风格"
            type={TagType.GALLERY_STYLE}
            value={galleryStyles}
            onChange={setGalleryStyles}
          />
        </>
      )}
    </>
  );
}
/**
 * 文章编辑侧栏字段组件，负责渲染文章状态、分类和标签等辅助字段。
 */
