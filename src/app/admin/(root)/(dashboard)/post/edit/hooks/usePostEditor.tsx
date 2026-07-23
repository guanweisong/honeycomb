"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ModalProps } from "../../category/components/AddCategoryModal";
import type { PhotoPickerItemProps } from "../components/PhotoPickerItem";
import { PostInsertSchema } from "@/packages/trpc/api/modules/post/schemas/post.insert.schema";
import type { PostInsert } from "@/packages/trpc/api/modules/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/packages/trpc/api/modules/post/schemas/post.update.schema";
import type { PostUpdate } from "@/packages/trpc/api/modules/post/schemas/post.update.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import type { PostDetailEntity } from "@/packages/trpc/api/modules/post/types/post.entity";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import { PostType } from "@/packages/trpc/api/modules/post/types/post.type";
import type { TagEntity } from "@/packages/trpc/api/modules/tag/types/tag.entity";
import { normalizePostForm } from "../utils/normalizePostForm";

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
      (errors) => console.error("validate errors", errors),
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
