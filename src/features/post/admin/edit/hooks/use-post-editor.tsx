"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ModalProps } from "../../category/components/AddCategoryModal";
import type { PhotoPickerItemProps } from "../components/PhotoPickerItem";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import type { PostInsert } from "@/features/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import type { PostUpdate } from "@/features/post/schemas/post.update.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import type { PostDetailViewModel as PostDetailEntity } from "../../../presentation/post-view-model";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import type { TagViewModel as TagEntity } from "../../../../tag/presentation/tag-view-model";
import { normalizePostForm } from "../utils/normalize-post-form";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";

type PostTagOption = Pick<TagEntity, "id" | "name">;
export type PostSubmitAction = "create" | "update";

export function usePostEditor(id: string) {
  const router = useRouter();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [modalProps, setModalProps] = useState<ModalProps>();
  const [loading, setLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<PostDetailEntity["cover"]>();
  const [galleryStyles, setGalleryStyles] = useState<PostTagOption[]>([]);
  const [movieActors, setMovieActors] = useState<PostTagOption[]>([]);
  const [movieDirectors, setMovieDirectors] = useState<PostTagOption[]>([]);
  const [movieStyles, setMovieStyles] = useState<PostTagOption[]>([]);

  const form = useForm({
    resolver: zodResolver(id ? PostUpdateSchema : PostInsertSchema),
    defaultValues: { type: PostType.ARTICLE },
  });
  const watchedType = useWatch({ control: form.control, name: "type" });
  const type = (watchedType as PostType | undefined) ?? PostType.ARTICLE;
  const { data: category } = trpc.category.adminIndex.useQuery({ limit: 9999 });
  const { data: detail, refetch } = trpc.post.adminDetail.useQuery({ id });
  const createPost = trpc.post.create.useMutation();
  const updatePost = trpc.post.update.useMutation();

  useEffect(() => {
    if (!detail) return;
    form.reset(detail);
    setCoverPreview(detail.cover);
    setGalleryStyles(detail.galleryStyles || []);
    setMovieActors(detail.movieActors || []);
    setMovieDirectors(detail.movieDirectors || []);
    setMovieStyles(detail.movieStyles || []);
  }, [detail, form]);

  const submit = (
    status: PostStatus,
    action: PostSubmitAction,
  ): Promise<void> =>
    form.handleSubmit(
      async (values) => {
        const normalized = normalizePostForm(values, status);
        if (!normalized.ok) {
          toast.error("请上传封面");
          return;
        }

        const data = normalized.data;
        setLoading(true);
        if (action === "create") {
          if (!data.categoryId) {
            toast.error("请选择分类目录");
            setLoading(false);
            return;
          }
          createPost
            .mutateAsync(data as PostInsert)
            .then((result) => {
              if (result.id) {
                toast.success("添加成功");
                router.push(`/admin/post/edit?id=${result.id}`);
              }
            })
            .finally(() => setLoading(false));
          return;
        }

        updatePost
          .mutateAsync({ ...data, id: detail!.id } as PostUpdate)
          .then((result) => {
            if (result) {
              toast.success("更新成功");
              refetch();
            }
          })
          .finally(() => setLoading(false));
      },
      () => {
        clientLogger.warn(LogEvent.clientError, {
          operation: "post.validate",
          outcome: "error",
        });
      },
    )();

  const photoPickerProps: PhotoPickerItemProps = {
    cover: coverPreview,
    handlePhotoClear: () => {
      form.setValue("coverId", undefined, { shouldDirty: true });
      setCoverPreview(undefined);
    },
    openPhotoPicker: () => setShowPhotoPicker(true),
    title: "封面",
    size: "1920*1080",
  };

  return {
    category,
    detail,
    form,
    galleryStyles,
    loading,
    modalProps,
    movieActors,
    movieDirectors,
    movieStyles,
    photoPickerProps,
    setCoverPreview,
    setGalleryStyles,
    setModalProps,
    setMovieActors,
    setMovieDirectors,
    setMovieStyles,
    setShowPhotoPicker,
    showPhotoPicker,
    submit,
    type,
  };
}
/**
 * 文章编辑 Hook，负责表单状态、文章查询和提交编排。
 */
