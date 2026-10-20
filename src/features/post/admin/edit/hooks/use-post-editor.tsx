"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PhotoPickerItemProps } from "../../../../media/components/PhotoPickerItem";
import { PostInsertSchema, PostUpdateSchema } from "@/features/post/schema";
import { trpc } from "@/lib/trpc/client/trpc";
import type { PostDetailResult as PostDetailEntity } from "@/features/post/types";
import { PostStatus } from "@/features/post/post-status";
import { PostType } from "@/features/post/post-type";
import { normalizePostForm } from "../utils/normalize-post-form";
import { clientLogger } from "@/lib/observability/client";
import { LogEvent } from "@/lib/observability/core/names";
import type { PostTagOption } from "../components/MultiTag/use-multi-tag";
import type { CategoryListItem as CategoryEntity } from "@/features/category/types";
import {
  notifyPublicSyncWarning,
  type AdminDialogState,
} from "@/components/admin/action-state";

import { useLocalDraft } from "@/components/admin/local-draft";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { can, Permission } from "@/lib/auth/permissions";
import { parsePostDraft } from "../utils/post-draft";

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
  const {
    data: detail,
    refetch,
    error: detailError,
  } = trpc.post.adminDetail.useQuery(
    { id: id ?? "" },
    { enabled: Boolean(id) },
  );
  const createPost = trpc.post.create.useMutation();
  const updatePost = trpc.post.update.useMutation();
  const { isDirty } = form.formState;
  const { user } = useCurrentUser();
  const draftValues = parsePostDraft(useWatch({ control: form.control })) ?? {};
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

  const previousAccount = useRef(user?.id);
  useEffect(() => {
    if (previousAccount.current !== user?.id) {
      previousAccount.current = user?.id;
      recordGeneration.current += 1;
      resetEditor(id && detail?.id === id ? detail : undefined);
    }
  }, [user?.id, id, detail, resetEditor]);

  const draft = useLocalDraft({
    storageKey:
      user &&
      can(user.level, id ? Permission.postUpdate : Permission.postCreate)
        ? `honeycomb:draft:post:${encodeURIComponent(user.id)}:${id ?? "new"}`
        : null,
    values: draftValues,
    dirty: isDirty,
    ready: !id || detail?.id === id,
    parse: parsePostDraft,
    onRestore: (values) => {
      form.reset(
        {
          ...values,
          id: form.getValues("id"),
          status: form.getValues("status"),
        },
        { keepDefaultValues: true },
      );
      // Do not display an unrelated server cover for a recovered selection.
      if (values.coverId !== coverPreview?.id) setCoverPreview(undefined);
    },
  });

  const submit = async (
    status: PostStatus,
    action: PostSubmitAction,
  ): Promise<boolean> => {
    if (submitting.current || isNavigating || (id && detail?.id !== id))
      return false;
    submitting.current = true;
    setLoading(true);
    let saved = false;
    const submittedValues = JSON.stringify(form.getValues());
    const submittedDraft = parsePostDraft(form.getValues()) ?? {};
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
              draft.clearSaved(submittedDraft);
              form.reset(data);
              if (!notifyPublicSyncWarning(result, toast.warning))
                toast.success("添加成功");
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
            let refreshed: Awaited<ReturnType<typeof refetch>> | undefined;
            try {
              refreshed = await refetch();
            } catch {
              // Keep the confirmed save and draft cleanup even if refreshing throws.
            }
            if (
              recordGeneration.current === submittedGeneration &&
              previousRecord.current?.id === detail.id
            ) {
              draft.clearSaved(submittedDraft);
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
            if (!notifyPublicSyncWarning(result, toast.warning))
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
    coverId: draftValues.coverId,
    handlePhotoClear: () => {
      form.setValue("coverId", undefined, { shouldDirty: true });
      setCoverPreview(undefined);
    },
    openPhotoPicker: () => setShowPhotoPicker(true),
    title: "封面",
    size: "1920*1080",
  };

  const loadError =
    id && detail?.id !== id && detailError
      ? detailError.data?.code === "NOT_FOUND"
        ? "not-found"
        : "error"
      : null;

  return {
    category,
    loadError,
    retryLoad: refetch,
    detail,
    draft,
    form,
    galleryStyles,
    loading:
      loading || isNavigating || Boolean(id && detail?.id !== id && !loadError),
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
