"use client";

import { usePostCreationResult } from "@/features/post/admin/edit/hooks/use-post-creation-result";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PhotoPickerItemProps } from "@/features/media/admin/components/PhotoPickerItem";
import { PostInsertSchema } from "@/features/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/features/post/schemas/post.update.schema";
import type { PostInsert } from "@/features/post/types/post.insert";
import { adminDetailQueryOptions } from "@/components/admin/config/query-options";
import { trpc } from "@/lib/trpc/client/trpc";
import { isDeterminateRejectionCode } from "@/lib/trpc/client/mutation-error";
import type { PostDetailResult as PostDetailEntity } from "@/features/post/types/post.read-model";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { normalizePostForm } from "@/features/post/admin/edit/utils/normalize-post-form";
import { clientLogger } from "@/lib/observability/client";
import { LogEvent } from "@/lib/observability/core/names";
import type { CategoryListItem as CategoryEntity } from "@/features/category/types/category.record";
import {
  notifyPublicSyncWarning,
  type AdminDialogState,
} from "@/components/admin/lib/action-state";

import { useLocalDraft } from "@/components/admin/draft/use-local-draft";
import { useCurrentUser } from "@/features/user/admin/use-current-user";
import { can, Permission } from "@/lib/auth/permissions";
import {
  parsePostDraft,
  PostEditorSchema,
  type PostEditorValues,
  type PostDraft,
  preservePostDraft,
  readPostCreationAttempt,
  writePostCreationAttempt,
  clearPostCreationAttempt,
} from "@/features/post/admin/edit/utils/post-draft";

export type PostSubmitAction = "create" | "update";

/**
 * 维护文章编辑快照、版本和账户隔离的创建尝试；未知结果必须先核对，不能换令牌重建。
 * 保存成功后的刷新失败与写入失败分开反馈，提交期间的新输入仍保留为未保存编辑。
 */
export function usePostEditor(id: string | null) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [modalProps, setModalProps] =
    useState<AdminDialogState<CategoryEntity>>();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const recordGeneration = useRef(0);
  const [isNavigating, startNavigation] = useTransition();
  const [coverPreview, setCoverPreview] = useState<PostDetailEntity["cover"]>();
  // Confirmed publication state never comes from editable/recovered form values.
  // Draft CAS provenance may intentionally be older than this server snapshot.
  const [confirmedBaseline, setConfirmedBaseline] = useState<
    Pick<PostDetailEntity, "id" | "version" | "status"> | undefined
  >(undefined);
  const [baselineVersion, setBaselineVersion] = useState<number>();
  const [saveProblem, setSaveProblem] = useState<"conflict" | "unknown" | null>(
    null,
  );
  const [preservedDraft, setPreservedDraft] = useState<PostDraft | null>(null);
  const [creationAttempt, setCreationAttempt] = useState<PostInsert | null>(
    null,
  );
  const form = useForm<PostEditorValues>({
    resolver: zodResolver(PostEditorSchema),
    defaultValues: {
      type: PostType.ARTICLE,
      galleryStyles: [],
      movieActors: [],
      movieDirectors: [],
      movieStyles: [],
    },
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
    { ...adminDetailQueryOptions, enabled: Boolean(id) },
  );
  const createPost = trpc.post.create.useMutation();
  const updatePost = trpc.post.update.useMutation();
  const { isDirty } = form.formState;
  const { user } = useCurrentUser();
  const userId = user?.id;
  useEffect(() => {
    submitting.current = false;
    setLoading(false);
    return () => {
      // Invalidate the owning visit, including account changes and unmounts.
      recordGeneration.current += 1;
    };
  }, [id, userId]);
  const draftValues =
    parsePostDraft({
      ...useWatch({ control: form.control }),
      baseVersion: baselineVersion,
    }) ?? {};
  const creationResult = usePostCreationResult(
    creationAttempt?.creationToken ?? "",
    userId,
    Boolean(user && !id && creationAttempt),
  );
  useEffect(() => {
    setCreationAttempt(!id && userId ? readPostCreationAttempt(userId) : null);
    setSaveProblem(null);
    setPreservedDraft(null);
  }, [id, userId]);
  const consumedSaveSnapshot = useRef<typeof detail>(undefined);
  const previousRecord = useRef<
    { id: string | null; detail: typeof detail } | undefined
  >(undefined);

  const resetEditor = useCallback(
    (post?: PostDetailEntity | null) => {
      setConfirmedBaseline(
        post
          ? { id: post.id, version: post.version, status: post.status }
          : undefined,
      );
      setBaselineVersion(post?.version);
      form.reset({
        ...post,
        type: post?.type ?? PostType.ARTICLE,
        galleryStyles: post?.galleryStyles ?? [],
        movieActors: post?.movieActors ?? [],
        movieDirectors: post?.movieDirectors ?? [],
        movieStyles: post?.movieStyles ?? [],
      });
      setCoverPreview(post?.cover);
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
      if (
        detail?.id === confirmedBaseline?.id &&
        detail &&
        confirmedBaseline &&
        detail.version < confirmedBaseline.version
      )
        return;
      if ((isDirty || submitting.current) && previous.detail?.id === id) return;
    }
    if (id && detail?.id !== id) {
      if (previous?.id !== id) resetEditor();
      return;
    }
    resetEditor(id ? detail : undefined);
  }, [confirmedBaseline, detail, id, isDirty, resetEditor]);

  const previousAccount = useRef(user?.id);
  useEffect(() => {
    if (previousAccount.current !== user?.id) {
      previousAccount.current = user?.id;
      resetEditor(id && detail?.id === id ? detail : undefined);
    }
  }, [user?.id, id, detail, resetEditor]);

  const applyDraft = (values: PostDraft) => {
    setBaselineVersion(values.baseVersion);
    form.reset(
      { ...values, id: form.getValues("id"), status: form.getValues("status") },
      { keepDefaultValues: true },
    );
    // Do not display an unrelated server cover for a recovered selection.
    if (values.coverId !== coverPreview?.id) setCoverPreview(undefined);
  };

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
      applyDraft(values);
      if (id && values.baseVersion === undefined) setSaveProblem("conflict");
    },
  });

  const finishCreation = (
    result: Pick<PostDetailEntity, "id" | "version">,
    attempt: PostInsert,
    submitted?: { json: string; draft: PostDraft },
  ) => {
    if (!user) return;
    const currentValues = form.getValues();
    if (
      submitted
        ? JSON.stringify(currentValues) !== submitted.json
        : form.formState.isDirty
    ) {
      // A recovered creation can already have later server edits. Never adopt its current
      // revision as the basis of our original creation content.
      const laterDraft = parsePostDraft({
        ...currentValues,
        baseVersion: submitted ? result.version : 0,
      });
      if (laterDraft && !preservePostDraft(user.id, result.id, laterDraft)) {
        setPreservedDraft(laterDraft);
        toast.warning(
          "文章已创建，但后续编辑无法备份。请保留当前页面并复制内容后打开文章",
        );
        return;
      }
    }
    clearPostCreationAttempt(user.id, attempt.creationToken);
    setCreationAttempt(null);
    if (submitted) draft.clearSaved(submitted.draft);
    startNavigation(() => router.push(`/admin/post/edit?id=${result.id}`));
  };

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
    const submittedDraft =
      parsePostDraft({ ...form.getValues(), baseVersion: baselineVersion }) ??
      {};
    const submittedGeneration = recordGeneration.current;

    try {
      await form.handleSubmit(
        async (values) => {
          if (recordGeneration.current !== submittedGeneration) return;
          const normalized = normalizePostForm(values, status);
          if (!normalized.ok) {
            toast.error("请上传封面");
            return;
          }

          const data = normalized.data;
          // Editor identity and option objects are not command fields.
          const fields = {
            categoryId: data.categoryId,
            coverId: data.coverId,
            status: data.status,
            type: data.type,
            commentStatus: data.commentStatus,
            movieTime: data.movieTime,
            galleryTime: data.galleryTime,
            title: data.title,
            content: data.content,
            excerpt: data.excerpt,
            quoteAuthor: data.quoteAuthor,
            quoteContent: data.quoteContent,
            galleryLocation: data.galleryLocation,
          };
          const relations =
            user && can(user.level, Permission.postManageTags)
              ? {
                  movieActorIds: data.movieActors?.map(({ id }) => id) ?? [],
                  movieDirectorIds:
                    data.movieDirectors?.map(({ id }) => id) ?? [],
                  movieStyleIds: data.movieStyles?.map(({ id }) => id) ?? [],
                  galleryStyleIds:
                    data.galleryStyles?.map(({ id }) => id) ?? [],
                }
              : {};
          if (action === "create") {
            if (!data.categoryId) {
              toast.error("请选择分类目录");
              return;
            }
            if (!user) return;
            if (creationAttempt) {
              toast.error("上次创建结果尚待核对，请使用下方的核对或重试操作");
              return;
            }
            const attempt = PostInsertSchema.parse({
              ...fields,
              ...relations,
              creationToken: crypto.randomUUID(),
            });
            if (!writePostCreationAttempt(user.id, attempt)) {
              toast.error("无法保存创建凭据，请允许浏览器本地存储后重试");
              return;
            }
            setCreationAttempt(attempt);
            const result = await createPost.mutateAsync(attempt);
            if (result.id) {
              // Invalidate even if this editor visit ended while persistence was pending.
              void utils.post.adminIndex.invalidate().catch(() => {});
              saved = true;
              if (
                recordGeneration.current !== submittedGeneration ||
                previousRecord.current?.id !== id
              )
                return;
              finishCreation(result, attempt, {
                json: submittedValues,
                draft: submittedDraft,
              });
              if (!notifyPublicSyncWarning(result, toast.warning))
                toast.success("添加成功");
            }
            return;
          }

          if (!detail) {
            toast.error("文章尚未加载，无法更新");
            return;
          }
          if (baselineVersion === undefined) {
            setSaveProblem("conflict");
            toast.error("缺少编辑版本，请先加载最新版本");
            return;
          }
          const result = await updatePost.mutateAsync(
            PostUpdateSchema.parse({
              ...fields,
              ...relations,
              id: detail.id,
              expectedVersion: baselineVersion,
            }),
          );
          if (result) {
            saved = true;
            // Persistence has succeeded; a failed read must not invite retrying the write.
            void utils.post.adminIndex.invalidate().catch(() => {});
            if (recordGeneration.current !== submittedGeneration) return;
            let refreshed: Awaited<ReturnType<typeof refetch>> | undefined;
            try {
              refreshed = await refetch();
            } catch {
              // Keep the confirmed save and draft cleanup even if refreshing throws.
            }
            if (recordGeneration.current !== submittedGeneration) return;
            if (previousRecord.current?.id === detail.id) {
              draft.clearSaved(submittedDraft);
              const currentValues = form.getValues();
              setConfirmedBaseline({
                id: detail.id,
                version: result.version,
                status: data.status,
              });
              setBaselineVersion(result.version);
              setSaveProblem(null);
              const savedDetail =
                refreshed?.isSuccess &&
                refreshed.data?.version === result.version
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
                setCoverPreview((current) =>
                  current === coverPreview ? savedDetail.cover : current,
                );
              }
            }
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
    } catch (error) {
      if (recordGeneration.current !== submittedGeneration) return false;
      const code =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "code" in error.data
          ? error.data.code
          : undefined;
      if (code === "CONFLICT") {
        setSaveProblem("conflict");
        toast.error("服务器已有更新，本地内容已保留，请核对最新版本");
      } else if (isDeterminateRejectionCode(String(code))) {
        if (action === "create" && user) {
          const attempt = readPostCreationAttempt(user.id);
          if (attempt) clearPostCreationAttempt(user.id, attempt.creationToken);
          setCreationAttempt(null);
        }
        toast.error(action === "create" ? "添加失败" : "更新失败");
      } else {
        setSaveProblem("unknown");
        toast.error("保存结果暂时无法确认，本地内容已保留，请先核对");
      }
      return false;
    } finally {
      if (recordGeneration.current === submittedGeneration) {
        submitting.current = false;
        setLoading(false);
      }
    }
  };

  const loadLatest = async () => {
    const local = parsePostDraft({
      ...form.getValues(),
      baseVersion: baselineVersion,
    });
    if (!local || !user || !id || !preservePostDraft(user.id, id, local)) {
      toast.error("无法保留本地内容，暂未替换表单");
      return;
    }
    setPreservedDraft(local);
    const requestedValues = JSON.stringify(form.getValues());
    const generation = recordGeneration.current;
    let latest: Awaited<ReturnType<typeof refetch>>;
    try {
      latest = await refetch();
    } catch {
      if (generation !== recordGeneration.current) return;
      toast.error("加载最新版本失败，本地内容已保留");
      return;
    }
    if (
      generation !== recordGeneration.current ||
      !latest.isSuccess ||
      !latest.data
    )
      return;
    if (
      latest.data.id === confirmedBaseline?.id &&
      latest.data.version < confirmedBaseline.version
    ) {
      toast.warning(
        "读取到的版本早于已确认保存，本地内容已保留，请稍后再次加载",
      );
      return;
    }
    consumedSaveSnapshot.current = latest.data;
    if (JSON.stringify(form.getValues()) !== requestedValues) {
      toast.warning("加载期间有新的本地编辑，未替换表单，请核对后再次加载");
      return;
    }
    resetEditor(latest.data);
    setSaveProblem(null);
  };
  const openCreated = () => {
    if (creationResult.data && user && creationAttempt) {
      finishCreation(creationResult.data, creationAttempt);
    }
  };
  const retryCreation = async () => {
    if (!creationAttempt || !user || submitting.current) return;
    const generation = recordGeneration.current;
    submitting.current = true;
    setLoading(true);
    try {
      const checked = await creationResult.refetch();
      if (generation !== recordGeneration.current) return;
      if (checked.data) {
        finishCreation(checked.data, creationAttempt);
        return;
      }
      if (!checked.isSuccess) {
        toast.error("无法核对上次创建，请稍后重试");
        return;
      }
      const result = await createPost.mutateAsync(creationAttempt);
      void utils.post.adminIndex.invalidate().catch(() => {});
      if (generation !== recordGeneration.current) return;
      finishCreation(result, creationAttempt);
      if (!notifyPublicSyncWarning(result, toast.warning))
        toast.success("已找到或保存上次创建");
    } catch {
      if (generation !== recordGeneration.current) return;
      toast.error("上次创建结果仍无法确认，原始内容和凭据已保留");
    } finally {
      if (generation === recordGeneration.current) {
        submitting.current = false;
        setLoading(false);
      }
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
    confirmedStatus:
      confirmedBaseline?.id === id ? confirmedBaseline.status : undefined,
    saveProblem,
    preservedDraft,
    restorePreservedDraft: () => {
      if (!preservedDraft) return;
      applyDraft(preservedDraft);
      setSaveProblem("conflict");
    },
    loadLatest,
    creationAttempt,
    creationResult,
    openCreated,
    retryCreation,
    loadError,
    retryLoad: refetch,
    detail,
    draft,
    form,
    loading:
      loading || isNavigating || Boolean(id && detail?.id !== id && !loadError),
    readOnly:
      Boolean(id && detail?.id !== id) || (!id && (loading || isNavigating)),
    modalProps,
    photoPickerProps,
    setCoverPreview,
    setModalProps,
    setShowPhotoPicker,
    showPhotoPicker,
    submit,
    type,
  };
}
