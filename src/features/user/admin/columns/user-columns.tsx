import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { UserEntity } from "@/packages/trpc/api/outputs";
import {
  UserLevelName,
  userLevelOptions,
} from "@/packages/domain/identity/user";
import { userStatusOptions } from "@/packages/domain/identity/user";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";

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

export function formatUserDate(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : format(date, "yyyy-MM-dd HH:mm:ss");
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
      const level = row.getValue("level") as string;
      return UserLevelName[level as keyof typeof UserLevelName] ?? level;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    meta: { filterOptions: userStatusOptions },
    cell: ({ row }) => {
      const presentation = getUserStatusPresentation(
        row.getValue("status") as string,
      );
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
    cell: ({ row }) => formatUserDate(row.getValue("createdAt")),
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    enableSorting: true,
    cell: ({ row }) => formatUserDate(row.getValue("updatedAt")),
  },
];
/**
 * 用户表格列定义、状态展示和日期格式化。
 */
