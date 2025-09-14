import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import { LinkStatus, LINK_STATUS } from "@honeycomb/db";

// Local shape for table rows (align with API payload)
type Link = {
  id: string;
  name: string;
  url: string;
  logo?: string | null;
  description: string;
  status: (typeof LINK_STATUS)[number];
  createdAt?: string;
  updatedAt?: string;
};

const linkStatusOptions = [
  {
    label: "禁用",
    value: LinkStatus.DISABLE,
  },
  {
    label: "启用",
    value: LinkStatus.ENABLE,
  },
];

export const linkTableColumns: ColumnDef<Link>[] = [
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
