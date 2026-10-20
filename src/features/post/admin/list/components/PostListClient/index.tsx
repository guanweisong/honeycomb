"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminListQueryOptions } from "@/components/admin/query-options";
import { Pencil, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { runAdminMutation } from "@/components/admin/action-state";
import { postListTableColumns } from "../../constants/post-list-table-columns";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { DataTable } from "@/components/DataTable";
import {
  type PostDelete,
  PostListQueryInput,
  PostListQuerySchema,
} from "@/features/post/schema";
import { trpc } from "@/lib/trpc/client/trpc";
import type { PostWithRelations as PostListItemEntity } from "@/features/post/types";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/features/user/admin/use-current-user";

/**
 * 文章列表客户端壳，负责查询、筛选、权限控制和删除交互。
 */
export default function PostListClient() {
  const canCreatePost = useCan(Permission.postCreate);
  const canUpdatePost = useCan(Permission.postUpdate);
  const canDeletePost = useCan(Permission.postDelete);
  const [selectedRows, setSelectedRows] = useState<PostListItemEntity[]>([]);
  const [deleteItems, setDeleteItems] = useState<PostDelete["items"] | null>(
    null,
  );
  const [searchParams, setSearchParams] = useState<PostListQueryInput>({});
  const router = useRouter();
  const { data, isFetching, isError, refetch } = trpc.post.adminIndex.useQuery(
    searchParams,
    adminListQueryOptions,
  );
  const destroyPost = trpc.post.destroy.useMutation();

  const handleDeleteItem = async (items: PostDelete["items"]) => {
    return runAdminMutation({
      input: { items },
      mutate: destroyPost.mutateAsync,
      refetch,
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
      successMessage: "删除成功",
      errorMessage: "删除失败",
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteItems) return false;
    const result = await handleDeleteItem(deleteItems);
    if (result !== "success") return false;
    setSelectedRows([]);
    return true;
  };

  return (
    <>
      <DataTable<PostListItemEntity>
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        onChange={(params) =>
          setSearchParams(PostListQuerySchema.parse(params))
        }
        columns={postListTableColumns}
        isFetching={isFetching}
        error={isError}
        onRetry={() => {
          void refetch();
        }}
        selectableRows={canDeletePost}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={(table) => (
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
                <Button
                  variant="outline"
                  disabled={!selectedRows.length}
                  onClick={() =>
                    setDeleteItems(
                      selectedRows.map(({ id, version }) => ({
                        id,
                        expectedVersion: version,
                      })),
                    )
                  }
                >
                  <Trash /> 批量删除
                </Button>
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
              onSubmit={({ title }) =>
                table.getColumn("title")?.setFilterValue(title)
              }
              inline
              submitProps={{ children: "查询", variant: "outline" }}
            />
          </div>
        )}
        rowActions={(row) => (
          <div className="flex gap-1">
            {canUpdatePost && (
              <Button
                variant="secondary"
                size="sm"
                aria-label="编辑文章"
                onClick={() => router.push(`/admin/post/edit?id=${row.id}`)}
              >
                <Pencil />
              </Button>
            )}
            {canDeletePost && (
              <Button
                variant="secondary"
                size="sm"
                aria-label="删除文章"
                onClick={() =>
                  setDeleteItems([{ id: row.id, expectedVersion: row.version }])
                }
              >
                <Trash />
              </Button>
            )}
          </div>
        )}
      />
      <Dialog
        open={deleteItems !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItems(null);
        }}
        type="danger"
        title="确定要删除吗？"
        onOK={handleConfirmDelete}
      />
    </>
  );
}
