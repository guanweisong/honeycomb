"use client";

import { useState } from "react";
import { postListTableColumns } from "./constants/postListTableColumns";
import { Button } from "@honeycomb/ui/components/button";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { DataTable } from "@honeycomb/ui/extended/DataTable";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PostListQuerySchema } from "@honeycomb/validation/post/schemas/post.list.query.schema";
import { trpc } from "@honeycomb/trpc/client/trpc";
import { PostEntity } from "@honeycomb/validation/post/schemas/post.entity.schema";
import { PageListQueryInput } from "@honeycomb/validation/page/schemas/page.list.query.schema";

/**
 * 文章列表管理页面。
 * 该组件负责展示文章列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const PostList = () => {
  const [selectedRows, setSelectedRows] = useState<PostEntity[]>([]);
  const [searchParams, setSearchParams] = useState<PageListQueryInput>({});
  const router = useRouter();

  // 使用 tRPC hook 获取文章列表数据
  const { data, isLoading, isError, refetch } =
    trpc.post.index.useQuery(searchParams);
  // 使用 tRPC hook 创建删除文章的 mutation
  const destroyPost = trpc.post.destroy.useMutation();

  /**
   * 处理单个或多个文章的删除操作。
   * @param {string[]} ids - 要删除的文章 ID 数组。
   */
  const handleDeleteItem = async (ids: string[]) => {
    try {
      await destroyPost.mutateAsync({ ids });
      refetch(); // 重新获取数据以更新列表
      toast.success("删除成功");
    } catch (e) {
      toast.error("删除失败");
    }
  };

  /**
   * 处理批量删除操作，获取选中行的 ID 并调用删除函数。
   */
  const handleDeleteBatch = async () => {
    const ids = selectedRows.map((item) => item.id);
    await handleDeleteItem(ids);
    setSelectedRows([]); // 清空选中行
  };

  return (
    <>
      <DataTable<PostEntity, PageListQueryInput>
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        onChange={(params) => {
          setSearchParams(params);
        }}
        columns={postListTableColumns}
        loading={isLoading}
        error={isError}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
          <div className="flex justify-between">
            {/* 工具栏左侧：新增和批量删除按钮 */}
            <div className="flex gap-1">
              <Button
                onClick={() => router.push("/post/edit")}
                variant="outline"
              >
                <Plus />
                添加新文章
              </Button>
              <Dialog
                trigger={
                  <Button
                    variant="outline"
                    disabled={selectedRows.length === 0}
                  >
                    <Trash />
                    批量删除
                  </Button>
                }
                type="danger"
                title="确定要删除吗？"
                onOK={handleDeleteBatch}
              />
            </div>
            {/* 工具栏右侧：搜索表单 */}
            <div className="flex gap-1">
              <DynamicForm
                schema={PostListQuerySchema}
                fields={[
                  {
                    name: "title",
                    type: "text",
                    placeholder: "请输入文章名称进行搜索",
                  },
                ]}
                onSubmit={setSearchParams}
                inline={true}
                submitProps={{
                  children: "查询",
                  variant: "outline",
                }}
              />
            </div>
          </div>
        }
        rowActions={(row) => (
          // 每行右侧的操作按钮：编辑和删除
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/post/edit?id=${row.id}`)}
            >
              <Pencil />
            </Button>
            <Dialog
              trigger={
                <Button variant="secondary" size="sm">
                  <Trash />
                </Button>
              }
              type="danger"
              title="确定要删除吗？"
              onOK={() => handleDeleteItem([row.id])}
            />
          </div>
        )}
      />
    </>
  );
};

export default PostList;
