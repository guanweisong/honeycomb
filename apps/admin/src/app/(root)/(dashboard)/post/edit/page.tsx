"use client";

import type { TagEntity } from "@/app/(root)/(dashboard)/tag/types/tag.entity";
import PhotoPickerModal from "@/components/PhotoPicker";
import { ModalType } from "@/types/ModalType";
import { Button } from "@honeycomb/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import AddCategoryModal, {
  ModalProps,
} from "../category/components/AddCategoryModal";
import MultiTag from "./components/MultiTag";
import type { PhotoPickerItemProps } from "./components/PhotoPickerItem";
import PhotoPickerItem from "./components/PhotoPickerItem";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Form } from "@honeycomb/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostInsertSchema } from "@honeycomb/validation/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@honeycomb/validation/post/schemas/post.update.schema";
import { DynamicField } from "@honeycomb/ui/extended/DynamicForm/DynamicField";
import { creatCategoryTitleByDepth } from "@/utils/help";
import { Plus } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { trpc } from "@honeycomb/trpc/client/trpc";

const tagMap = {
  galleryStyles: "galleryStyleIds",
  movieDirectors: "movieDirectorIds",
  movieActors: "movieActorIds",
  movieStyles: "movieStyleIds",
} as const;

const PostDetail = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [modalProps, setModalProps] = useState<ModalProps>();
  const [loading, setLoading] = useState(false);

  const id = searchParams.get("id");

  const form = useForm({
    resolver: zodResolver(id ? PostUpdateSchema : PostInsertSchema),
    defaultValues: {
      type: PostType.ARTICLE,
    },
  });

  const type = (form.watch("type") as PostType) ?? PostType.ARTICLE;

  const { data: category } = trpc.category.index.useQuery({ limit: 9999 });
  const { data: detail, refetch } = trpc.post.detail.useQuery({ id });
  const createPost = trpc.post.create.useMutation();
  const updatePost = trpc.post.update.useMutation();

  // 初始化/同步表单数据
  useEffect(() => {
    if (detail) {
      form.reset({
        ...detail,
        galleryStyleIds: detail.galleryStyles?.map((t) => t.id),
        movieDirectorIds: detail.movieDirectors?.map((t) => t.id),
        movieActorIds: detail.movieActors?.map((t) => t.id),
        movieStyleIds: detail.movieStyles?.map((t) => t.id),
        coverId: detail.cover?.id,
      });
    }
  }, [detail, form]);

  const normalizeFormData = (values: any, status: PostStatus) => {
    const data: any = { ...values, status };

    if (
      [PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(
        data.type,
      ) &&
      !data.coverId
    ) {
      toast.error("请上传封面");
      return null;
    }

    return data;
  };

  const handleFormSubmit = (
    status: PostStatus,
    actionType: "create" | "update",
  ) => {
    return form.handleSubmit(
      async (values) => {
        const data = normalizeFormData(values, status);
        if (!data) return;

        setLoading(true);
        try {
          if (actionType === "create") {
            const res = await createPost.mutateAsync(data as any);
            toast.success("添加成功");
            router.push(`/post/edit?id=${(res as any).id}`);
          } else if (actionType === "update" && detail?.id) {
            await updatePost.mutateAsync({ id: detail.id, data: data as any });
            toast.success("更新成功");
            refetch();
          }
        } finally {
          setLoading(false);
        }
      },
      (errors) => {
        console.error("validate errors", errors);
      },
    )();
  };

  const getBtns = () => {
    const isEdit = !!detail?.id;
    const isDraft = detail?.status === PostStatus.DRAFT;
    const isPublished = detail?.status === PostStatus.PUBLISHED;

    return (
      <>
        {isEdit && isPublished && (
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleFormSubmit(PostStatus.PUBLISHED, "update")}
          >
            更新
          </Button>
        )}

        {isEdit && isPublished && (
          <Dialog
            trigger={
              <Button type="button" variant="secondary" disabled={loading}>
                撤回为草稿
              </Button>
            }
            type="danger"
            title="确定要撤回吗？"
            onOK={() => handleFormSubmit(PostStatus.DRAFT, "update")}
          />
        )}

        {isEdit && isDraft && (
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleFormSubmit(PostStatus.DRAFT, "update")}
          >
            保存
          </Button>
        )}

        {((isEdit && isDraft) || !isEdit) && (
          <Button
            type="button"
            disabled={loading}
            onClick={() =>
              handleFormSubmit(
                PostStatus.PUBLISHED,
                isEdit ? "update" : "create",
              )
            }
          >
            发布
          </Button>
        )}

        {!isEdit && (
          <Button
            type="button"
            onClick={() => handleFormSubmit(PostStatus.DRAFT, "create")}
          >
            保存草稿
          </Button>
        )}
      </>
    );
  };

  const photoPickerProps: PhotoPickerItemProps = {
    coverId: form.watch("coverId"),
    handlePhotoClear: () =>
      form.setValue("coverId", undefined, { shouldDirty: true }),
    openPhotoPicker: () => setShowPhotoPicker(true),
    title: "封面",
    size: "1920*1080",
  };

  const onUpdateTags = (
    name: keyof typeof tagMap,
    tags: Omit<TagEntity, "updatedAt" | "createdAt">[],
  ) => {
    form.setValue(
      tagMap[name],
      tags.map((t) => t.id),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const tagProps = {
    onTagsChange: onUpdateTags,
  };

  return (
    <>
      <Form {...form}>
        <form>
          <div className="lg:flex">
            <div className="lg:flex-1 flex flex-col gap-3 mb-3">
              {([
                PostType.ARTICLE,
                PostType.MOVIE,
                PostType.PHOTOGRAPH,
              ].includes(type) ||
                !type) && (
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
              )}
              {type === PostType.QUOTE && (
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
              )}
            </div>

            <div className="lg:w-80 lg:ml-8 space-y-4">
              <div className="flex gap-3 justify-end">{getBtns()}</div>
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
                options={category?.list?.map((item) => ({
                  label: creatCategoryTitleByDepth(item.title.zh, item),
                  value: item.id ?? "0",
                }))}
              />
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  setModalProps({ open: true, type: ModalType.ADD })
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                新建分类
              </Button>

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
                  <MultiTag {...tagProps} name="movieDirectors" title="导演" />
                  <MultiTag {...tagProps} name="movieActors" title="演员" />
                  <MultiTag {...tagProps} name="movieStyles" title="电影风格" />
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
                    {...tagProps}
                    name="galleryStyles"
                    title="照片风格"
                  />
                </>
              )}
            </div>
          </div>
        </form>
      </Form>

      <PhotoPickerModal
        showPhotoPicker={showPhotoPicker}
        handlePhotoPickerOk={(media) => {
          form.setValue("coverId", media.id, { shouldDirty: true });
          setShowPhotoPicker(false);
        }}
        handlePhotoPickerCancel={() => setShowPhotoPicker(false)}
      />

      <AddCategoryModal modalProps={modalProps} setModalProps={setModalProps} />
    </>
  );
};

export default PostDetail;
