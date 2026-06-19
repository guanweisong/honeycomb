"use client";

import { Button } from "@/packages/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  PageInsert,
  PageInsertSchema,
} from "@/packages/trpc/api/modules/page/schemas/page.insert.schema";
import { PageUpdate } from "@/packages/trpc/api/modules/page/schemas/page.update.schema";
import { toast } from "sonner";
import { trpc } from "@/packages/trpc/client/trpc";
import { PageStatus } from "@/packages/trpc/api/modules/page/types/page.status";
import { PageEntity } from "@/packages/trpc/api/modules/page/types/page.entity";
import { useForm } from "react-hook-form";
import { Form } from "@/packages/ui/components/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DynamicField } from "@/packages/ui/extended/DynamicForm/DynamicField";
import { Dialog } from "@/packages/ui/extended/Dialog";
import {
  PageTemplate,
  pageTemplateOptions,
} from "@/packages/trpc/api/modules/page/types/page.template";
import { z } from "zod";

type PageFormValues = z.infer<typeof PageInsertSchema>;

function toPageFormValues(
  detail?: {
    title?: PageFormValues["title"] | null;
    content?: PageFormValues["content"] | null;
    status?: PageFormValues["status"];
    template?: string | null;
  } | null,
): Partial<PageFormValues> | undefined {
  if (!detail) {
    return undefined;
  }

  return {
    title: detail.title ?? undefined,
    content: detail.content ?? undefined,
    status: detail.status ?? undefined,
    template:
      (detail.template as PageTemplate | undefined) ?? PageTemplate.DEFAULT,
  };
}

/**
 * 页面创建/编辑页面核心组件。
 * 这是一个用于处理页面新建和编辑操作的"超级表单"组件。
 * 它使用 `DynamicForm` 进行表单状态管理，使用 tRPC 与后端进行数据交互。
 */
const PageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  /**
   * 加载状态，控制按钮的禁用。
   */
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm({
    resolver: zodResolver(PageInsertSchema),
    defaultValues: {
      template: PageTemplate.DEFAULT,
    },
  });

  const id = searchParams.get("id");

  /**
   * 获取页面详情的 tRPC 查询。
   * `data` 包含页面详情数据，`refetch` 用于手动重新获取数据。
   */
  const { data: detail, refetch } = trpc.page.detail.useQuery(
    { id: id as string },
    {
      enabled: !!id,
    },
  );

  /**
   * 副作用钩子，用于在编辑模式下同步表单数据。
   * 当 `detail` 数据从后端加载完毕后，此 effect 会被触发，
   * 它使用 `formRef.current?.setValues` 方法将获取到的页面数据填充到表单的各个字段中。
   * 如果 `detail` 不存在，则重置表单。
   */
  useEffect(() => {
    if (detail) {
      form.reset(toPageFormValues(detail) ?? {});
    } else {
      form.reset({
        template: PageTemplate.DEFAULT,
      });
    }
  }, [detail, form]);

  /**
   * 创建页面的 tRPC mutation。
   */
  const createPage = trpc.page.create.useMutation();
  /**
   * 更新页面的 tRPC mutation。
   */
  const updatePage = trpc.page.update.useMutation();

  /**
   * 表单提交处理器。
   * 根据当前是创建还是更新操作，调用相应的 tRPC mutation。
   * @param {Partial<PageEntity>} values - 表单提交的值。
   * @param {PageStatus} status - 页面状态（草稿或已发布）。
   */
  const handleSubmit = async (
    values: Partial<PageEntity>,
    status: PageStatus,
  ) => {
    try {
      const data = { ...values, status };
      setLoading(true);
      if (detail?.id) {
        return updatePage
          .mutateAsync({ id: detail.id, ...data } as PageUpdate)
          .then(() => {
            toast.success("更新成功");
            refetch();
          })
          .finally(() => setLoading(false));
      } else {
        return createPage
          .mutateAsync(data as PageInsert)
          .then((result) => {
            toast.success("添加成功");
            router.push(`/admin/page/edit?id=${result.id}`);
          })
          .finally(() => setLoading(false));
      }
    } catch (e) {
      console.error(e);
      toast.error("提交失败，请检查表单内容");
    }
  };

  /**
   * 处理页面操作按钮点击事件。
   * 设置提交状态，并触发表单提交。
   * @param {PageStatus} status - 页面状态（草稿或已发布）。
   */
  const handleBtnClick = (status: PageStatus) => {
    void form.handleSubmit((values) => handleSubmit(values, status))();
  };

  /**
   * 根据页面状态动态生成操作按钮。
   * @returns {JSX.Element[]} 按钮数组。
   */
  const getBtns = () => {
    const isEdit = !!detail?.id;
    const isDraft = detail?.status === PageStatus.DRAFT;
    const isPublished = detail?.status === PageStatus.PUBLISHED;

    return (
      <>
        {isEdit && isPublished && (
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
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
            onOK={() => handleBtnClick(PageStatus.DRAFT)}
          />
        )}

        {isEdit && isDraft && (
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.DRAFT)}
          >
            保存
          </Button>
        )}

        {((isEdit && isDraft) || !isEdit) && (
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
          >
            发布
          </Button>
        )}

        {!isEdit && (
          <Button
            type="button"
            onClick={() => handleBtnClick(PageStatus.DRAFT)}
          >
            保存草稿
          </Button>
        )}
      </>
    );
  };

  return (
    <>
      <Form {...form}>
        <form className="lg:flex">
          <div className="lg:flex-1 flex flex-col gap-3 mb-3">
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
          </div>
          <div className="lg:w-80 lg:ml-8 space-y-4">
            <div className="flex gap-3 justify-end">{getBtns()}</div>
            <DynamicField
              name="template"
              type="select"
              label="模板类型"
              options={pageTemplateOptions}
            />
          </div>
        </form>
      </Form>
    </>
  );
};

const Page = () => {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
};

export default Page;
