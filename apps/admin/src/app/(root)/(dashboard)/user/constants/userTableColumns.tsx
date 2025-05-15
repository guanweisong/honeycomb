import dayjs from "dayjs";
import { UserEntity } from "../types/user.entity";
import { userLevelOptions } from "../types/UserLevel";
import { userStatusOptions } from "../types/UserStatus";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@ui/components/button";
import { ColumnDef } from "@tanstack/react-table";

export const userTableColumns: ColumnDef<UserEntity>[] = [
  {
    accessorKey: "name",
    header: "用户名",
  },
  {
    accessorKey: "level",
    header: "级别",
    cell: ({ row }) => {
      const level = row.getValue("level") as string;
      return userLevelOptions.find((opt) => opt.value === level)?.label;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          添加时间
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value: string = row.getValue("createdAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          最后更新日期
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const value: string = row.getValue("updatedAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
