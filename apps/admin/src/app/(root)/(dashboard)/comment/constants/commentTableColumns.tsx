import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import dayjs from "dayjs";
import type { CommentEntity } from "../types/comment.entity";
import { commentStatusOptions } from "../types/CommentStatus";

export const commentTableColumns: ColumnDef<CommentEntity>[] = [
  {
    accessorKey: "content",
    header: "评论内容",
  },
  {
    accessorKey: "postId",
    header: "评论文章",
    cell: ({ row }) => {
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
      const value = getValue<string>();
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    cell: ({ getValue }) => {
      const value = getValue<string>();
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
