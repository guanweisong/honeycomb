import dayjs from "dayjs";
import { UserEntity } from "../types/user.entity";
import { userLevelOptions } from "../types/UserLevel";
import { userStatusOptions } from "../types/UserStatus";
import { ColumnDef } from "@tanstack/react-table";

export const userTableColumns: ColumnDef<UserEntity>[] = [
  {
    accessorKey: "name",
    header: "用户名",
  },
  {
    accessorKey: "level",
    header: "级别",
    meta: {
      filterOptions: userLevelOptions,
    },
    cell: ({ row }) => {
      const level = row.getValue("level") as string;
      return userLevelOptions.find((opt) => opt.value === level)?.label;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    meta: {
      filterOptions: userStatusOptions,
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return userStatusOptions.find((opt) => opt.value === status)?.label;
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
    cell: ({ row }) => {
      const value: string = row.getValue("createdAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    enableSorting: true,
    cell: ({ row }) => {
      const value: string = row.getValue("updatedAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
