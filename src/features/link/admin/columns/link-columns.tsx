import type { ColumnDef } from "@tanstack/react-table";
import type { LinkViewModel as LinkEntity } from "../../presentation/link-view-model";
import { enableStatusOptions } from "@/packages/domain/shared/enable-status";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";
import { formatAdminDateTime } from "@/packages/ui/admin/date-time";

export function getLinkStatusPresentation(status: string) {
  return {
    label:
      enableStatusOptions.find((option) => option.value === status)?.label ??
      status,
    tone: status === "ENABLE" ? StatusBadgeTone.GREEN : StatusBadgeTone.RED,
  };
}

export const linkTableColumns: ColumnDef<LinkEntity>[] = [
  {
    header: "链接名称",
    accessorKey: "name",
  },
  {
    header: "URL",
    accessorKey: "url",
  },
  {
    header: "状态",
    accessorKey: "status",
    meta: { filterOptions: enableStatusOptions },
    cell: ({ row }) => (
      <StatusBadge {...getLinkStatusPresentation(row.original.status ?? "-")} />
    ),
  },
  {
    header: "链接描述",
    accessorKey: "description",
  },
  {
    header: "添加时间",
    accessorKey: "createdAt",
    cell: ({ row }) => formatAdminDateTime(row.original.createdAt),
  },
];
/**
 * 链接表格列定义和启用状态展示转换。
 */
