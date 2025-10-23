"use client";

import { Button } from "@honeycomb/ui/components/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DynamicForm,
  DynamicFormRef,
} from "@honeycomb/ui/extended/DynamicForm";
import { PageInsertSchema } from "@honeycomb/validation/page/schemas/page.insert.schema";
import { PageUpdateSchema } from "@honeycomb/validation/page/schemas/page.update.schema";
import { toast } from "sonner";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { PageStatus } from "@honeycomb/types/page/page.status";
import { PageEntity } from "@honeycomb/trpc/server/types/page.entity";

/**
 * 页面创建/编辑页面核心组件。
 * 这是一个用于处理页面新建和编辑操作的"超级表单"组件。
 * 它使用 `DynamicForm` 进行表单状态管理，使用 tRPC 与后端进行数据交互。
 */
const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<DynamicFormRef>(null);
  /**
   * 用于存储提交状态的引用，例如草稿或已发布。
   */
  const submitStatusRef = useRef<PageStatus>(null);
  /**
   * 加载状态，控制按钮的禁用。
   */
  const [loading, setLoading] = useState<boolean>(false);

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
      formRef.current?.setValues(detail);
    } else {
      formRef.current?.reset();
    }
  }, [detail]);

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
          .mutateAsync({ id: detail.id, ...data })
          .then(() => {
            toast.success("更新成功");
            refetch();
          })
          .finally(() => setLoading(false));
      } else {
        // @ts-ignore
        return createPage
          .mutateAsync(data as any)
          .then((result) => {
            toast.success("添加成功");
            router.push(`/page/edit?id=${(result as any).id}`);
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
    submitStatusRef.current = status;
    formRef.current?.submit();
  };

  /**
   * 根据页面状态动态生成操作按钮。
   * @returns {JSX.Element[]} 按钮数组。
   */
  const getBtns = () => {
    const btns = [];

    if (detail?.id) {
      if (detail.status === PageStatus.PUBLISHED) {
        btns.push(
          <Button
            key="update"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
          >
            更新
          </Button>,
        );
      }
      if (detail.status === PageStatus.DRAFT) {
        btns.push(
          <Button
            key="publish"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
          >
            发布
          </Button>,
          <Button
            key="save"
            disabled={loading}
            onClick={() => handleBtnClick(PageStatus.DRAFT)}
          >
            保存
          </Button>,
        );
      }
    } else {
      btns.push(
        <Button
          key="draft"
          disabled={loading}
          onClick={() => handleBtnClick(PageStatus.DRAFT)}
          variant="secondary"
        >
          保存草稿
        </Button>,
        <Button
          disabled={loading}
          key="publish"
          onClick={() => handleBtnClick(PageStatus.PUBLISHED)}
        >
          发布
        </Button>,
      );
    }

    return btns;
  };

  return (
    <>
      <DynamicForm
        ref={formRef}
        schema={id ? PageUpdateSchema : PageInsertSchema}
        fields={[
          {
            name: "title",
            placeholder: "在此输入文章标题",
            type: "text",
            multiLang: true,
          },
          {
            name: "content",
            type: "richText",
            multiLang: true,
          },
        ]}
        renderSubmitButton={false}
        onSubmit={(values) => {
          const status = submitStatusRef.current;
          if (!status) {
            toast.error("提交状态未定义");
            return;
          }
          handleSubmit(values, status);
        }}
      />
      <div className="flex justify-end gap-3 mt-3">{getBtns()}</div>
    </>
  );
};

export default Page;
