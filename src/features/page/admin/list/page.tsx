"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { pageListTableColumns } from "@/features/page/admin/list/constants/page-list-table-columns";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { DynamicForm } from "@/components/DynamicForm";
import { DataTable } from "@/components/DataTable";
import { toast } from "sonner";
import Link from "next/link";
import type { PageListQueryInput } from "@/features/page/types/page.list-query";
import { PageListQuerySchema } from "@/features/page/schemas/page.list-query.schema";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  adminDetailQueryOptions,
  adminListQueryOptions,
} from "@/components/admin/config/query-options";
import type { PageListItem as PageEntity } from "@/features/page/types/page.read-model";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/features/user/admin/use-current-user";
import { runAdminMutation } from "@/components/admin/lib/action-state";

/**
 * 页面列表管理页面。
 * 该组件负责展示页面列表，并提供搜索、新增、编辑、删除等管理功能。
 */
const Page = () => {
  const canCreatePage = useCan(Permission.pageCreate);
  const canUpdatePage = useCan(Permission.pageUpdate);
  const canDeletePage = useCan(Permission.pageDelete);
  /**
   * 存储用户在表格中选中的行。
   * 类型为 `PageEntity` 数组。
   */
  const [selectedRows, setSelectedRows] = useState<PageEntity[]>([]);
  /**
   * 存储页面列表的查询参数。
   * 当这些参数变化时，会触发页面列表的重新加载。
   */
  const [searchParams, setSearchParams] = useState<PageListQueryInput>(() =>
    PageListQuerySchema.parse({ page: 1, limit: 20 }),
  );
  const utils = trpc.useUtils();
  const prefetchDetail = (id: string) => {
    void utils.page.adminDetail.prefetch(
      { id },
      { ...adminDetailQueryOptions, retry: false },
    );
  };
  /**
   * 获取页面列表数据的 tRPC 查询。
   * `data` 包含列表数据和总数，`isFetching` 表示加载状态，`isError` 表示错误状态，`refetch` 用于手动重新获取数据。
   */
  const { data, isFetching, isError, refetch } = trpc.page.adminIndex.useQuery(
    searchParams,
    adminListQueryOptions,
  );
  /**
   * 删除页面的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyPage = trpc.page.destroy.useMutation({
    // Mark every filter stale; the existing flow refreshes the current list once.
    onSuccess: () =>
      utils.page.adminIndex
        .invalidate(undefined, { refetchType: "none" })
        .catch(() => {}),
  });

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (rows: PageEntity[]) => {
    return runAdminMutation({
      input: {
        items: rows.map(({ id, version }) => ({
          id,
          expectedVersion: version,
        })),
      },
      mutate: destroyPage.mutateAsync,
      refetch: async () => {
        try {
          const result = await refetch();
          if (!result.isSuccess)
            toast.warning("已删除，列表待刷新，请勿重复删除");
        } catch {
          toast.warning("已删除，列表待刷新，请勿重复删除");
        }
      },
      notifySuccess: toast.success,
      notifyWarning: toast.warning,
      notifyError: toast.error,
      successMessage: "删除成功",
      errorMessage: "删除失败",
    });
  };

  /**
   * 批量删除
   */
  const handleDeleteBatch = async () => {
    const result = await handleDeleteItem(selectedRows);
    if (result !== "success") return false;
    setSelectedRows([]);
    return true;
  };

  return (
    <>
      <DataTable<PageEntity>
        getRowId={(row) => row.id}
        data={{
          list: data?.list ?? [],
          total: data?.total ?? 0,
        }}
        isFetching={isFetching}
        error={isError}
        onRetry={() => {
          void refetch();
        }}
        onChange={(params) => {
          setSearchParams(PageListQuerySchema.parse(params));
        }}
        columns={pageListTableColumns}
        selectableRows={canDeletePage}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        toolBar={(table) => (
          <div className="flex justify-between">
            <div className="flex gap-1">
              {canCreatePage && (
                <Button asChild variant="outline">
                  <Link href="/admin/page/edit">
                    <Plus />
                    添加新页面
                  </Link>
                </Button>
              )}
              {canDeletePage && (
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
              )}
            </div>
            <div className="flex gap-1">
              <DynamicForm
                schema={PageListQuerySchema}
                fields={[
                  {
                    name: "title",
                    type: "text",
                    placeholder: "搜索页面名称",
                  },
                ]}
                onSubmit={({ title }) =>
                  table.getColumn("title")?.setFilterValue(title)
                }
                inline={true}
                submitProps={{
                  children: "查询",
                  variant: "outline",
                }}
              />
            </div>
          </div>
        )}
        rowActions={(row) => (
          <div className="flex gap-1">
            {canUpdatePage && (
              <Button
                aria-label="编辑页面"
                variant="secondary"
                size="sm"
                asChild
              >
                <Link
                  href={`/admin/page/edit?id=${row.id}`}
                  onMouseEnter={() => prefetchDetail(row.id)}
                  onFocus={() => prefetchDetail(row.id)}
                >
                  <Pencil />
                </Link>
              </Button>
            )}
            {canDeletePage && (
              <Dialog
                trigger={
                  <Button variant="secondary" size="sm" aria-label="删除页面">
                    <Trash />
                  </Button>
                }
                type="danger"
                title="确定要删除吗？"
                onOK={async () => (await handleDeleteItem([row])) === "success"}
              />
            )}
          </div>
        )}
      />
    </>
  );
};

export default Page;
