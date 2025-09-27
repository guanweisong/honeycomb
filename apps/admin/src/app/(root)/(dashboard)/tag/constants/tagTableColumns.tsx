import MultiLangText from "@/components/MultiLangText";
import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import { TagEntity } from "@honeycomb/validation/tag/schemas/tag.entity.schema";

export const tagTableColumns: ColumnDef<TagEntity>[] = [
  {
    accessorKey: "name",
    header: "标签名称",
    cell: ({ row }) => <MultiLangText text={row.getValue("name")} />,
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    enableSorting: true,
    cell: ({ row }) =>
      dayjs(row.getValue("createdAt")).format("YYYY-MM-DD HH:mm:ss"),
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    enableSorting: true,
    cell: ({ row }) =>
      dayjs(row.getValue("updatedAt")).format("YYYY-MM-DD HH:mm:ss"),
  },
];
