"use client";

import type { TagEntity } from "@/app/(root)/(dashboard)/tag/types/tag.entity";
import PhotoPickerModal from "@/components/PhotoPicker";
import { ModalType } from "@/types/ModalType";
import { Button } from "@honeycomb/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import AddCategoryModal, {
  ModalProps,
} from "../category/components/AddCategoryModal";
import type { CategoryEntity } from "../category/types/category.entity";
import { PostStatus } from "../types/PostStatus";
import { PostType, postTypeOptions } from "../types/PostType";
import type { PostEntity } from "../types/post.entity";
import MultiTag from "./components/MultiTag";
import type { PhotoPickerItemProps } from "./components/PhotoPickerItem";
import PhotoPickerItem from "./components/PhotoPickerItem";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Form } from "@honeycomb/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostCreateSchema } from "@honeycomb/validation/post/schemas/post.create.schema";
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
};

const PostDetail = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [detail, setDetail] = useState<PostEntity>();
  const [list, setList] = useState<CategoryEntity[]>([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [modalProps, setModalProps] = useState<ModalProps>();
  const [loading, setLoading] = useState(false);

  const id = searchParams.get("id");

  const form = useForm({
    resolver: zodResolver(id ? PostUpdateSchema : PostCreateSchema),
    defaultValues: {
      type: PostType.ARTICLE,
    },
  });

  const type = (form.watch("type") ?? detail?.type) as PostType;

  const categoryQuery = trpc.category.index.useQuery({ limit: 9999 });
  useEffect(() => {
    if (categoryQuery.data) setList((categoryQuery.data as any).list ?? []);
  }, [categoryQuery.data]);

  useEffect(() => {
    if (!id) return;
    indexDetail({ id });
    return () => {
      form.reset();
      setDetail(undefined);
    };
  }, [id]);

  const normalizeFormData = (values: any, status: PostStatus) => {
    const data: any = { ...values, status };
    debugger;
    if (
      [PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(
        data.type,
      ) &&
      !data.coverId
    ) {
      toast.error("请上传封面");
      return null;
    }

    if (data.cover) {
      data.coverId = data.cover.id;
      delete data.cover;
    }

    return data;
  };

  const detailQuery = trpc.post.detail.useQuery(
    { id: (searchParams.get("id") as string) ?? "" },
    {
      enabled: !!id,
      onSuccess: (res) => {
        setDetail(res as any);
        form.reset(res as any);
      },
    },
  );

  const createPost = trpc.post.create.useMutation();
  const updatePost = trpc.post.update.useMutation();

  const handleFormSubmit = (
    status: PostStatus,
    actionType: "create" | "update",
  ) => {
    return form.handleSubmit(
      (values) => {
        const data = normalizeFormData(values, status);
        if (!data) return;
        if (actionType === "create") {
          setLoading(true);
          return createPost
            .mutateAsync(data as any)
            .then((res) => {
              toast.success("添加成功");
              router.push(`/post/edit?id=${(res as any).id}`);
            })
            .finally(() => {
              setLoading(false);
            });
        } else if (actionType === "update" && detail?.id) {
          setLoading(true);
          return updatePost
            .mutateAsync({ id: detail.id, data: data as any })
            .then((res) => {
              toast.success("更新成功");
              detailQuery.refetch();
            })
            .finally(() => {
              setLoading(false);
            });
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

    if (isEdit) {
      if (isPublished) {
        return (
          <>
            <Button
              type={"button"}
              disabled={loading}
              onClick={() => handleFormSubmit(PostStatus.PUBLISHED, "update")}
            >
              更新
            </Button>
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
          </>
        );
      }
      if (isDraft) {
        return (
          <>
            <Button
              type={"button"}
              disabled={loading}
              onClick={() => handleFormSubmit(PostStatus.DRAFT, "update")}
            >
              保存
            </Button>
            <Button
              type={"button"}
              disabled={loading}
              onClick={() => handleFormSubmit(PostStatus.PUBLISHED, "update")}
            >
              发布
            </Button>
          </>
        );
      }
    }
    return (
      <>
        <Button
          type={"button"}
          onClick={() => handleFormSubmit(PostStatus.DRAFT, "create")}
        >
          保存草稿
        </Button>
        <Button
          type={"button"}
          disabled={loading}
          onClick={() => handleFormSubmit(PostStatus.PUBLISHED, "create")}
        >
          发布
        </Button>
      </>
    );
  };

  const photoPickerProps: PhotoPickerItemProps = {
    detail,
    handlePhotoClear: () => {
      const { cover, ...rest } = detail as PostEntity;
      setDetail(rest);
    },
    openPhotoPicker: () => setShowPhotoPicker(true),
    title: "封面",
    size: "1920*1080",
  };

  const onUpdateTags = (
    name: "movieActors" | "movieDirectors" | "movieStyles" | "galleryStyles",
    tags: Omit<TagEntity, "updatedAt" | "createdAt">[],
  ) => {
    setDetail({ ...detail, [name]: tags } as PostEntity);
    form.setValue(
      // @ts-ignore
      tagMap[name],
      tags.map((item) => item.id),
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );
  };

  const tagProps = {
    detail,
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
              <div className="flex gap-1 justify-end">{getBtns()}</div>
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
                options={list.map((item) => ({
                  label: creatCategoryTitleByDepth(item.title.zh, item),
                  value: item.id ?? "0",
                }))}
              />
              <Button
                variant="outline"
                type={"button"}
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
          setDetail({
            ...detail,
            cover: media,
            coverId: media.id,
          } as PostEntity);
          form.setValue("coverId", media.id);
          setShowPhotoPicker(false);
        }}
        handlePhotoPickerCancel={() => setShowPhotoPicker(false)}
      />
      <AddCategoryModal modalProps={modalProps} setModalProps={setModalProps} />
    </>
  );
};

export default PostDetail;
