import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { LinkEntity } from "@/packages/trpc/api/outputs";
import { enableStatusOptions } from "@/packages/domain/shared/enable-status";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";

export function getLinkStatusPresentation(status: string) {
  return {
    label:
      enableStatusOptions.find((option) => option.value === status)?.label ??
      status,
    tone:
      status === "ENABLE" ? StatusBadgeTone.GREEN : StatusBadgeTone.RED,
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
      <StatusBadge
        {...getLinkStatusPresentation(row.getValue("status") as string)}
      />
    ),
  },
  {
    header: "链接描述",
    accessorKey: "description",
  },
  {
    header: "添加时间",
    accessorKey: "createdAt",
    cell: ({ row }) =>
      format(
        new Date(row.getValue("createdAt") as string),
        "yyyy-MM-dd HH:mm:ss",
      ),
  },
];
