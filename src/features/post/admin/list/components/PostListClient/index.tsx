"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { postListTableColumns } from "../../constants/post-list-table-columns";
import { Button } from "@/packages/ui/components/button";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { DataTable } from "@/packages/ui/extended/DataTable";
import {
  PostListQueryInput,
  PostListQuerySchema,
} from "@/features/post/schemas/post.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";
import type { PostListViewModel as PostListItemEntity } from "../../../../presentation/post-view-model";
import { Permission } from "@/packages/identity/auth/permissions";
import { useCan } from "@/features/contracts/admin/use-current-user";

/**
 * 文章列表客户端壳，负责查询、筛选、权限控制和删除交互。
 */
export default function PostListClient() {
  const canCreatePost = useCan(Permission.postCreate);
  const canUpdatePost = useCan(Permission.postUpdate);
  const canDeletePost = useCan(Permission.postDelete);
  const [selectedRows, setSelectedRows] = useState<PostListItemEntity[]>([]);
  const [searchParams, setSearchParams] = useState<PostListQueryInput>({});
  const router = useRouter();
  const { data, isFetching, isError, refetch } = trpc.post.adminIndex.useQuery(
    searchParams,
    { placeholderData: keepPreviousData, staleTime: 60 * 1000 },
  );
  const destroyPost = trpc.post.destroy.useMutation();

  const handleDeleteItem = async (ids: string[]) => {
    try {
      await destroyPost.mutateAsync({ ids });
      await refetch();
      toast.success("删除成功");
    } catch {
      toast.error("删除失败");
    }
  };

  const handleDeleteBatch = async () => {
    await handleDeleteItem(selectedRows.map((item) => item.id));
    setSelectedRows([]);
  };

  return (
    <DataTable<PostListItemEntity, PostListQueryInput>
      data={{
        list: (data?.list as PostListItemEntity[]) ?? [],
        total: data?.total ?? 0,
      }}
      onChange={setSearchParams}
      columns={postListTableColumns}
      isFetching={isFetching}
      error={isError}
      selectableRows={canDeletePost}
      selectedRows={selectedRows}
      onSelectionChange={setSelectedRows}
      toolBar={
        <div className="flex justify-between">
          <div className="flex gap-1">
            {canCreatePost && (
              <Button
                onClick={() => router.push("/admin/post/edit")}
                variant="outline"
              >
                <Plus /> 添加新文章
              </Button>
            )}
            {canDeletePost && (
              <Dialog
                trigger={
                  <Button variant="outline" disabled={!selectedRows.length}>
                    <Trash /> 批量删除
                  </Button>
                }
                type="danger"
                title="确定要删除吗？"
                onOK={handleDeleteBatch}
              />
            )}
          </div>
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
            inline
            submitProps={{ children: "查询", variant: "outline" }}
          />
        </div>
      }
      rowActions={(row) => (
        <div className="flex gap-1">
          {canUpdatePost && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/admin/post/edit?id=${row.id}`)}
            >
              <Pencil />
            </Button>
          )}
          {canDeletePost && (
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
          )}
        </div>
      )}
    />
  );
}
