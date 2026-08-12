import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/app/admin/components/MultiLangText";
import type { CommentEntity } from "@/packages/trpc/api/outputs";
import { commentStatusOptions } from "@/packages/domain/content/comment";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";
import { getStatusBadgeTone } from "@/packages/ui/extended/StatusBadge/statusTone";

export function getCommentStatusPresentation(status?: string | null) {
  const toneMap = {
    TO_AUDIT: StatusBadgeTone.AMBER,
    PUBLISH: StatusBadgeTone.GREEN,
    RUBBISH: StatusBadgeTone.GRAY,
    BAN: StatusBadgeTone.RED,
  } as const;

  return commentStatusOptions
    .filter((option) => status?.includes(option.value))
    .map((option) => ({
      label: option.label,
      tone: getStatusBadgeTone(option.value, toneMap),
    }));
}

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
      const statuses = getCommentStatusPresentation(row.original.status);
      return (
        <div className="flex flex-wrap gap-1">
          {statuses.length ? (
            statuses.map((status) => (
              <StatusBadge key={status.label} {...status} />
            ))
          ) : (
            <span>—</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    cell: ({ getValue }) =>
      format(new Date(getValue<string>()), "yyyy-MM-dd HH:mm:ss"),
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    cell: ({ getValue }) =>
      format(new Date(getValue<string>()), "yyyy-MM-dd HH:mm:ss"),
  },
];
