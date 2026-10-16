"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import type { PostDetailResult as PostDetailEntity } from "@/features/post/application/repository";
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
  const recordGeneration = useRef(0);
  useEffect(
    () => () => {
      // A completed request must not affect another visit, even to the same ID.
      recordGeneration.current += 1;
    },
    [id],
  );
  const [isNavigating, startNavigation] = useTransition();
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
  const { isDirty } = form.formState;
  const consumedSaveSnapshot = useRef<typeof detail>(undefined);
  const previousRecord = useRef<
    | {
        id: string | null;
        detail: typeof detail;
      }
    | undefined
  >(undefined);

  const resetEditor = useCallback(
    (post?: PostDetailEntity | null) => {
      form.reset(post ?? { type: PostType.ARTICLE });
      setCoverPreview(post?.cover);
      setGalleryStyles(post?.galleryStyles || []);
      setMovieActors(post?.movieActors || []);
      setMovieDirectors(post?.movieDirectors || []);
      setMovieStyles(post?.movieStyles || []);
    },
    [form],
  );

  useEffect(() => {
    const previous = previousRecord.current;
    previousRecord.current = { id, detail };
    if (previous?.id !== id) consumedSaveSnapshot.current = undefined;
    if (previous?.id === id) {
      // Changes to dirty state alone must not reapply an older query snapshot.
      if (previous.detail === detail) return;
      if (detail === consumedSaveSnapshot.current) return;
      if ((isDirty || submitting.current) && previous.detail?.id === id) return;
    }
    if (id && detail?.id !== id) {
      if (previous?.id !== id) resetEditor();
      return;
    }
    resetEditor(id ? detail : undefined);
  }, [detail, id, isDirty, resetEditor]);

  const submit = async (
    status: PostStatus,
    action: PostSubmitAction,
  ): Promise<boolean> => {
    if (submitting.current || isNavigating) return false;
    submitting.current = true;
    setLoading(true);
    let saved = false;
    const submittedValues = JSON.stringify(form.getValues());
    const submittedGeneration = recordGeneration.current;

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
              if (
                recordGeneration.current !== submittedGeneration ||
                previousRecord.current?.id !== id
              )
                return;
              form.reset(data);
              if (result.publicSync === "degraded") {
                toast.warning("已保存，公开内容同步未完成，请稍后检查公开页面");
              } else toast.success("添加成功");
              startNavigation(() =>
                router.push(`/admin/post/edit?id=${result.id}`),
              );
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
            // Persistence has succeeded; a failed read must not invite retrying the write.
            const refreshed = await refetch().catch(() => undefined);
            if (
              recordGeneration.current === submittedGeneration &&
              previousRecord.current?.id === detail.id
            ) {
              const currentValues = form.getValues();
              const savedDetail = refreshed?.isSuccess
                ? refreshed.data
                : undefined;
              if (savedDetail) {
                // This snapshot is applied here, not again by query hydration.
                consumedSaveSnapshot.current = savedDetail;
              }
              form.reset(savedDetail ?? data);
              if (JSON.stringify(currentValues) !== submittedValues) {
                // Keep later edits dirty against the snapshot that actually saved.
                form.reset(
                  { ...currentValues, status },
                  { keepDefaultValues: true },
                );
              }
              if (savedDetail) {
                // Tag relations save independently; do not replace newer selections.
                setCoverPreview((current) =>
                  current === coverPreview ? savedDetail.cover : current,
                );
                setGalleryStyles((current) =>
                  current === galleryStyles
                    ? savedDetail.galleryStyles || []
                    : current,
                );
                setMovieActors((current) =>
                  current === movieActors
                    ? savedDetail.movieActors || []
                    : current,
                );
                setMovieDirectors((current) =>
                  current === movieDirectors
                    ? savedDetail.movieDirectors || []
                    : current,
                );
                setMovieStyles((current) =>
                  current === movieStyles
                    ? savedDetail.movieStyles || []
                    : current,
                );
              }
            }
            saved = true;
            if (result.publicSync === "degraded") {
              toast.warning("已保存，公开内容同步未完成，请稍后检查公开页面");
            } else toast.success("更新成功");
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
    loading: loading || isNavigating || Boolean(id && detail?.id !== id),
    readOnly:
      Boolean(id && detail?.id !== id) || (!id && (loading || isNavigating)),
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
