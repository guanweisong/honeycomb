import { enableOptions } from "@/types/EnableType";
import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import type { LinkEntity } from "../types/link.entity";

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
    meta: {
      filterOptions: enableOptions,
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return enableOptions.find((opt) => opt.value === status)?.label;
    },
  },
  {
    header: "链接描述",
    accessorKey: "description",
  },
  {
    header: "添加时间",
    accessorKey: "createdAt",
    cell: ({ row }) => {
      const value: string = row.getValue("createdAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
