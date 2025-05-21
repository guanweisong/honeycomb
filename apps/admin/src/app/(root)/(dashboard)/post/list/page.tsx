"use client";

import { useRef, useState } from "react";
import PostService from "../service";
import type { PostEntity } from "../types/post.entity";
import { PostIndexRequest } from "../types/post.index.request";
import { postListTableColumns } from "./constants/postListTableColumns";
import { Button } from "@honeycomb/ui/components/button";
import { Pencil, Plus, Trash } from "lucide-react";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { DataTable, DataTableRef } from "@honeycomb/ui/extended/DataTable";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PostListQuerySchema } from "@honeycomb/validation/post/schemas/post.list.query.schema";

const PostList = () => {
  const tableRef = useRef<DataTableRef>(null);
  const [selectedRows, setSelectedRows] = useState<PostEntity[]>([]);
  const [searchParams, setSearchParams] = useState<PostIndexRequest>();
  const router = useRouter();

  /**
   * 删除事件
   * @param ids
   */
  const handleDeleteItem = async (ids: string[]) => {
    return PostService.destroy(ids).then((result) => {
      if (result.status === 204) {
        tableRef.current?.reload();
        toast.success("删除成功");
      }
    });
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
      <DataTable<PostEntity, PostIndexRequest>
        request={PostService.indexPostList}
        columns={postListTableColumns}
        selectableRows={true}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        params={searchParams}
        ref={tableRef}
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
