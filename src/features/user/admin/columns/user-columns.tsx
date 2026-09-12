import type { ColumnDef } from "@tanstack/react-table";
import type { UserViewModel as UserEntity } from "../../presentation/user-view-model";
import {
  UserLevelName,
  userLevelOptions,
} from "@/packages/domain/identity/user";
import { userStatusOptions } from "@/packages/domain/identity/user";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";
import { formatAdminDateTime } from "@/packages/ui/admin/date-time";

export function getUserStatusPresentation(status: string) {
  const label =
    userStatusOptions.find((option) => option.value === status)?.label ??
    status;

  switch (status) {
    case "ENABLE":
      return { label, tone: StatusBadgeTone.GREEN };
    case "DISABLE":
      return { label, tone: StatusBadgeTone.RED };
    case "DELETED":
    default:
      return { label, tone: StatusBadgeTone.GRAY };
  }
}

export const userTableColumns: ColumnDef<UserEntity>[] = [
  {
    accessorKey: "name",
    header: "用户名",
  },
  {
    accessorKey: "level",
    header: "级别",
    meta: { filterOptions: userLevelOptions },
    cell: ({ row }) => {
      const level = row.original.level;
      return UserLevelName[level] ?? level;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    meta: { filterOptions: userStatusOptions },
    cell: ({ row }) => {
      const presentation = getUserStatusPresentation(row.original.status);
      return <StatusBadge {...presentation} />;
    },
  },
  {
    accessorKey: "email",
    header: "用户邮箱",
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    enableSorting: true,
    cell: ({ row }) => formatAdminDateTime(row.original.createdAt),
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    enableSorting: true,
    cell: ({ row }) => formatAdminDateTime(row.original.updatedAt),
  },
];
/**
 * 用户表格列定义、状态展示和日期格式化。
 */
