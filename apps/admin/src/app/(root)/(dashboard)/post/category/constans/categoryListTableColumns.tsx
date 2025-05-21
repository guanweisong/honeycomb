import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import { MultiLang } from "@/types/MulitLang";
import { creatCategoryTitleByDepth } from "@/utils/help";
import { EnableType, EnableTypeName } from "@/types/EnableType";
import { CategoryEntity } from "../types/category.entity";

export const categoryListTableColumns: ColumnDef<CategoryEntity>[] = [
  {
    accessorKey: "title",
    header: "分类名称",
    cell: ({ row }) => {
      const title = row.getValue("title") as MultiLang;
      const record = row.original;
      return creatCategoryTitleByDepth(<MultiLangText text={title} />, record);
    },
  },
  {
    accessorKey: "path",
    header: "路径",
  },
  {
    accessorKey: "description",
    header: "分类描述",
    cell: ({ row }) => {
      const description = row.getValue("description") as MultiLang;
      return <MultiLangText text={description} />;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const status = row.getValue("status") as EnableType;
      return EnableTypeName[EnableType[status] as keyof typeof EnableTypeName];
    },
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.getValue("createdAt") as string;
      return (
        <span className="whitespace-nowrap">
          {dayjs(value).format("YYYY-MM-DD HH:mm:ss")}
        </span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "最后更新日期",
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.getValue("updatedAt") as string;
      return (
        <span className="whitespace-nowrap">
          {dayjs(value).format("YYYY-MM-DD HH:mm:ss")}
        </span>
      );
    },
  },
];
