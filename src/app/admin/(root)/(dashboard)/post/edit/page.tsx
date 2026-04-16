"use client";

import PhotoPickerModal from "@/app/admin/components/PhotoPicker";
import { ModalType } from "@/app/admin/types/ModalType";
import { Button } from "@/packages/ui/components/button";
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
import { Form } from "@/packages/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostInsertSchema } from "@/packages/trpc/api/modules/post/schemas/post.insert.schema";
import { PostUpdateSchema } from "@/packages/trpc/api/modules/post/schemas/post.update.schema";
import { DynamicField } from "@/packages/ui/extended/DynamicForm/DynamicField";
import { creatCategoryTitleByDepth } from "@/app/admin/libs/help";
import { Plus } from "lucide-react";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { trpc } from "@/packages/trpc/client/trpc";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import {
  PostType,
  postTypeOptions,
} from "@/packages/trpc/api/modules/post/types/post.type";
import { PostDetailEntity } from "@/packages/trpc/api/modules/post/types/post.entity";
import { TagType } from "@/packages/trpc/api/modules/tag/types/tag.type";

/**
 * 文章创建/编辑页面核心组件。
 * 这是一个功能非常丰富的"超级表单"组件，用于处理所有类型的文章的新建和编辑操作。
 * 它使用 `react-hook-form` 进行表单状态管理，使用 tRPC 与后端进行数据交互。
 * 表单的结构会根据所选的 `PostType` (文章类型) 动态变化。
 */
const PostDetail = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [modalProps, setModalProps] = useState<ModalProps>();
  const [loading, setLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<PostDetailEntity["cover"]>();

  const id = searchParams.get("id") as string;

  const form = useForm({
    resolver: zodResolver(id ? PostUpdateSchema : PostInsertSchema),
    defaultValues: {
      type: PostType.ARTICLE,
    },
  });

  const type = (form.watch("type") as PostType) ?? PostType.ARTICLE;

  const { data: category } = trpc.category.index.useQuery({ limit: 9999 });
  const { data: detail, refetch } = trpc.post.detail.useQuery({
    id,
  });
  const createPost = trpc.post.create.useMutation();
  const updatePost = trpc.post.update.useMutation();

  /**
   * Effect hook: 用于在编辑模式下同步表单数据。
   * 当 `detail` 数据从后端加载完毕后，此 effect 会被触发。
   * 它使用 `form.reset` 方法将获取到的文章数据填充到表单的各个字段中。
   */
  useEffect(() => {
    if (detail && form) {
      form.reset(detail);
      setCoverPreview(detail.cover);
    }
  }, [detail, form]);

  /**
   * 规范化表单数据。
   * 在提交前对表单数据进行处理，例如添加文章状态，并进行必要的验证。
   * @param {any} values - 原始表单值。
   * @param {PostStatus} status - 文章的状态（如 PUBLISHED, DRAFT）。
   * @returns {any | null} 规范化后的数据，如果验证失败则返回 null。
   */
  const normalizeFormData = (values: any, status: PostStatus): any | null => {
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

  /**
   * 表单提交处理器。
   * 这是一个高阶函数，它根据提交的动作（发布、保存草稿等）返回一个可供表单使用的 `onSubmit` 函数。
   * @param {PostStatus} status - 要设置给文章的状态（如 `PUBLISHED`, `DRAFT`）。
   * @param {"create" | "update"} actionType - 当前的操作类型。
   * @returns {Function} 一个由 `react-hook-form` 的 `handleSubmit` 包裹的异步函数。
   *
   * 内部逻辑：
   * 1. 调用 `normalizeFormData` 验证并格式化表单数据。
   * 2. 根据 `actionType` 调用 `createPost` 或 `updatePost` tRPC mutation。
   * 3. 在 API 调用成功后，显示成功提示，并（在创建时）跳转到编辑页面。
   * 4. 捕获并处理任何验证或 API 错误。
   */
  const handleFormSubmit = (
    status: PostStatus,
    actionType: "create" | "update",
  ): Promise<void> => {
    return form.handleSubmit(
      async (values) => {
        const data = normalizeFormData(values, status);
        if (!data) return;
        setLoading(true);
        switch (actionType) {
          case "create":
            createPost
              .mutateAsync(data)
              .then((res) => {
                if (res.id) {
                  toast.success("添加成功");
                  router.push(`/admin/post/edit?id=${res.id}`);
                }
              })
              .finally(() => setLoading(false));
            break;
          case "update":
            updatePost
              .mutateAsync({ ...data, id: detail!.id })
              .then((res) => {
                if (res) {
                  toast.success("更新成功");
                  refetch();
                }
              })
              .finally(() => setLoading(false));
            break;
        }
      },
      (errors) => {
        console.error("validate errors", errors);
      },
    )();
  };

  /**
   * 根据文章的当前状态，动态渲染操作按钮。
   * @returns {JSX.Element} 返回一个包含多个按钮的 React Fragment。
   *
   * 渲染逻辑：
   * - **编辑模式 & 已发布**: 显示“更新”和“撤回为草稿”按钮。
   * - **编辑模式 & 草稿**: 显示“保存”和“发布”按钮。
   * - **新建模式**: 显示“发布”和“保存草稿”按钮。
   */
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

  /**
   * 封面图片选择器组件的属性。
   * 包含封面ID、清除封面图片的回调函数、打开图片选择器的回调函数、标题和尺寸提示。
   */
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

  /**
   * 处理标签更新的回调函数。
   * 当多选标签组件的标签发生变化时调用。
   */
  const [galleryStyles, setGalleryStyles] = useState<any[]>([]);
  const [movieActors, setMovieActors] = useState<any[]>([]);
  const [movieDirectors, setMovieDirectors] = useState<any[]>([]);
  const [movieStyles, setMovieStyles] = useState<any[]>([]);

  /**
   * 同步 detail 数据到标签状态
   */
  useEffect(() => {
    if (detail) {
      setGalleryStyles(detail.galleryStyles || []);
      setMovieActors(detail.movieActors || []);
      setMovieDirectors(detail.movieDirectors || []);
      setMovieStyles(detail.movieStyles || []);
    }
  }, [detail]);

  return (
    <>
      <Form {...form}>
        <form>
          <div className="lg:flex">
            {/* 主内容区 */}
            <div className="lg:flex-1 flex flex-col gap-3 mb-3">
              {/* 根据文章类型，动态渲染不同的核心字段 */}
              {([
                PostType.ARTICLE,
                PostType.MOVIE,
                PostType.PHOTOGRAPH,
              ].includes(type) ||
                !type) && (
                // 文章、电影、摄影类型共有字段
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
              {/* 引用类型专属字段 */}
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

            {/* 侧边栏设置区 */}
            <div className="lg:w-80 lg:ml-8 space-y-4">
              {/* 操作按钮 */}
              <div className="flex gap-3 justify-end">{getBtns()}</div>
              {/* 通用设置 */}
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

              {/* 特定类型专属设置 */}
              {[PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH].includes(
                type,
              ) && <PhotoPickerItem {...photoPickerProps} />}

              {/* 电影类型专属字段 */}
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

              {/* 摄影类型专属字段 */}
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
            </div>
          </div>
        </form>
      </Form>

      <PhotoPickerModal
        showPhotoPicker={showPhotoPicker}
        handlePhotoPickerOk={(media) => {
          form.setValue("coverId", media.id, { shouldDirty: true });
          setCoverPreview(media);
          setShowPhotoPicker(false);
        }}
        handlePhotoPickerCancel={() => setShowPhotoPicker(false)}
      />

      <AddCategoryModal modalProps={modalProps} setModalProps={setModalProps} />
    </>
  );
};

export default PostDetail;
