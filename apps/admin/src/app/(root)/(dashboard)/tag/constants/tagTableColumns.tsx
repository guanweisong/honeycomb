import MultiLangText from "@/components/MultiLangText";
import { MultiLang } from "@/types/MulitLang";
import dayjs from "dayjs";
import type { TagEntity } from "../types/tag.entity";
import { ColumnDef } from "@tanstack/react-table";

export const tagTableColumns: ColumnDef<TagEntity>[] = [
  {
    accessorKey: "name",
    header: "标签名称",
    cell: ({ getValue }) => <MultiLangText text={getValue() as MultiLang} />,
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    enableSorting: true,
    cell: ({ getValue }) =>
      dayjs(getValue() as string).format("YYYY-MM-DD HH:mm:ss"),
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    enableSorting: true,
    cell: ({ getValue }) =>
      dayjs(getValue() as string).format("YYYY-MM-DD HH:mm:ss"),
  },
];
