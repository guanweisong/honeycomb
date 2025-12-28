import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/app/admin/components/MultiLangText";
import dayjs from "dayjs";
import { commentStatusOptions } from "@/packages/types/comment/comment.status";
import { CommentEntity } from "@/packages/trpc/server/types/comment.entity";

/**
 * 评论列表的表格列定义。
 * 定义了评论管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
export const commentTableColumns: ColumnDef<CommentEntity>[] = [
  {
    accessorKey: "content",
    header: "评论内容",
  },
  {
    accessorKey: "postId",
    header: "评论文章",
    cell: ({ row }) => {
      /**
       * 渲染评论文章标题的单元格。
       * 根据评论关联的文章、页面或自定义标题显示多语言标题。
       */
      const record = row.original;
      const title =
        record.post?.title || record.page?.title || record.custom?.title;
      return <MultiLangText text={title!} />;
    },
  },
  {
    accessorKey: "author",
    header: "评论人",
  },
  {
    accessorKey: "email",
    header: "评论人邮箱",
  },
  {
    accessorKey: "site",
    header: "评论人网站",
  },
  {
    accessorKey: "ip",
    header: "评论IP",
  },
  {
    accessorKey: "status",
    header: "评论状态",
    cell: ({ row }) => {
      /**
       * 渲染评论状态的单元格。
       * 将评论状态值映射为对应的中文标签。
       */
      const value = row.original.status;
      const labels = commentStatusOptions
        .filter((opt) => value?.includes(opt.value))
        .map((opt) => opt.label)
        .join(", ");
      return <span>{labels || "—"}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    cell: ({ getValue }) => {
      /**
       * 渲染创建时间的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
      const value = getValue<string>();
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    cell: ({ getValue }) => {
      /**
       * 渲染最后更新日期的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
      const value = getValue<string>();
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
