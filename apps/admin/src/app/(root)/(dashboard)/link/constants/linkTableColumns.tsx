import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import { LinkEntity } from "@honeycomb/validation/link/schemas/link.entity.schema";
import { linkStatusOptions } from "@honeycomb/db";

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
      filterOptions: linkStatusOptions,
    },
    cell: ({ row }) => {
      const status = row.getValue("status");
      return linkStatusOptions.find((opt) => opt.value === status)?.label;
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
