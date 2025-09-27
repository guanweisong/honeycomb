import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import { MultiLang } from "@/types/MulitLang";
import { Badge } from "@honeycomb/ui/components/badge";
import { PageEntity } from "@honeycomb/validation/page/schemas/page.entity.schema";
import { pageStatusOptions } from "@honeycomb/db";

export const pageListTableColumns: ColumnDef<PageEntity>[] = [
  {
    accessorKey: "title",
    header: "文章名称",
    cell: ({ row }) => {
      const title = row.getValue("title") as MultiLang;
      return <MultiLangText text={title} />;
    },
  },
  {
    accessorKey: "author",
    header: "作者",
    cell: ({ row }) => {
      const author = row.getValue("author") as any;
      return author?.name ?? "-";
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    meta: {
      filterOptions: pageStatusOptions,
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const label =
        pageStatusOptions.find((opt) => opt.value === status)?.label ?? status;
      return (
        <Badge variant={status === "published" ? "default" : "secondary"}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "发表时间",
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
  {
    accessorKey: "views",
    header: "点击量",
    enableSorting: true,
  },
];
