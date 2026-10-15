"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PhotoPickerItemProps } from "../components/PhotoPickerItem";
import {
  PostInsertSchema,
  PostUpdateSchema,
} from "@/features/post/application/write-schema";
import { trpc } from "@/packages/trpc/client/trpc";
import type { PostDetailViewModel as PostDetailEntity } from "../../../presentation/post-view-model";
import { PostStatus } from "@/packages/domain/content/post-status";
import { PostType } from "@/packages/domain/content/post";
import { normalizePostForm } from "../utils/normalize-post-form";
import { clientLogger } from "@/packages/infrastructure/observability/client";
import { LogEvent } from "@/packages/infrastructure/observability/core/names";
import type { PostTagOption } from "../components/MultiTag/use-multi-tag";
import type { CategoryViewModel as CategoryEntity } from "@/features/category/public";
import type { AdminDialogState } from "@/packages/ui/admin/action-state";

export type PostSubmitAction = "create" | "update";

export function usePostEditor(id: string | null) {
  const router = useRouter();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [modalProps, setModalProps] =
    useState<AdminDialogState<CategoryEntity>>();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
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
  const type = watchedType ?? PostType.ARTICLE;
  const { data: category } = trpc.category.adminTree.useQuery();
  const { data: detail, refetch } = trpc.post.adminDetail.useQuery(
    { id: id ?? "" },
    { enabled: Boolean(id) },
  );
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

  const submit = async (
    status: PostStatus,
    action: PostSubmitAction,
  ): Promise<boolean> => {
    if (submitting.current) return false;
    submitting.current = true;
    setLoading(true);
    let saved = false;

    try {
      await form.handleSubmit(
        async (values) => {
          const normalized = normalizePostForm(values, status);
          if (!normalized.ok) {
            toast.error("请上传封面");
            return;
          }

          const data = normalized.data;
          if (action === "create") {
            if (!data.categoryId) {
              toast.error("请选择分类目录");
              return;
            }
            const result = await createPost.mutateAsync(
              PostInsertSchema.parse(data),
            );
            if (result.id) {
              saved = true;
              toast.success("添加成功");
              router.push(`/admin/post/edit?id=${result.id}`);
            }
            return;
          }

          if (!detail) {
            toast.error("文章尚未加载，无法更新");
            return;
          }
          const result = await updatePost.mutateAsync(
            PostUpdateSchema.parse({ ...data, id: detail.id }),
          );
          if (result) {
            await refetch();
            saved = true;
            toast.success("更新成功");
          }
        },
        () => {
          clientLogger.warn(LogEvent.clientError, {
            operation: "post.validate",
            outcome: "error",
          });
        },
      )();
      return saved;
    } catch {
      toast.error(action === "create" ? "添加失败" : "更新失败");
      return false;
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

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
