import type { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import { formatAdminDateTime } from "@/lib/ui/admin-date-time";
import type { AdminCommentViewModel } from "@/features/comment/presentation/comment-view-model";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { CommentStatusName } from "@/features/comment/types/comment.status-name";
import { StatusBadge, StatusBadgeTone } from "@/components/StatusBadge";

const commentStatusTones = {
  [CommentStatus.TO_AUDIT]: StatusBadgeTone.AMBER,
  [CommentStatus.PUBLISH]: StatusBadgeTone.GREEN,
  [CommentStatus.RUBBISH]: StatusBadgeTone.GRAY,
  [CommentStatus.BAN]: StatusBadgeTone.RED,
} satisfies Record<CommentStatus, StatusBadgeTone>;

export function getCommentStatusPresentation(status?: CommentStatus | null) {
  return status
    ? { label: CommentStatusName[status], tone: commentStatusTones[status] }
    : null;
}

export const commentTableColumns: ColumnDef<AdminCommentViewModel>[] = [
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
      return <MultiLangText text={title} />;
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
      const status = getCommentStatusPresentation(row.original.status);
      return (
        <div className="flex flex-wrap gap-1">
          {status ? <StatusBadge {...status} /> : <span>—</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    cell: ({ getValue }) => formatAdminDateTime(getValue<string>()),
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    cell: ({ getValue }) => formatAdminDateTime(getValue<string>()),
  },
];
/**
 * 评论表格列定义及状态展示转换。
 */
