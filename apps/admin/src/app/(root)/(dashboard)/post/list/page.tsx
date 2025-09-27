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

const PostList = () => {
  const [selectedRows, setSelectedRows] = useState<PostEntity[]>([]);
  const [searchParams, setSearchParams] = useState<PageListQueryInput>({});
  const router = useRouter();
  const { data, isLoading, isError, refetch } =
    trpc.post.index.useQuery(searchParams);
  const destroyPost = trpc.post.destroy.useMutation();

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    try {
      await destroyPost.mutateAsync({ ids });
      refetch();
      toast.success("删除成功");
    } catch (e) {
      toast.error("删除失败");
    }
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = async () => {
    const ids = selectedRows.map((item) => item.id);
    await handleDeleteItem(ids);
    setSelectedRows([]);
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
        loading={isLoading}
        error={isError}
        columns={postListTableColumns}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={
          <div className="flex justify-between">
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
