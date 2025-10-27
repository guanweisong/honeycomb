import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { Badge } from "@honeycomb/ui/components/badge";
import { pageStatusOptions } from "@honeycomb/types/page/page.status";
import { PageEntity } from "@honeycomb/trpc/server/types/page.entity";

/**
 * 页面列表的表格列定义。
 * 定义了页面管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
export const pageListTableColumns: ColumnDef<PageEntity>[] = [
  {
    accessorKey: "title",
    header: "文章名称",
    cell: ({ row }) => {
      /**
       * 渲染文章标题的单元格。
       * 显示多语言标题。
       */
      const title = row.getValue("title") as MultiLang;
      return <MultiLangText text={title} />;
    },
  },
  {
    accessorKey: "author",
    header: "作者",
    cell: ({ row }) => {
      /**
       * 渲染作者名称的单元格。
       * 如果作者信息不存在，则显示 "-"。
       */
      const author = row.getValue("author");
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
      /**
       * 渲染页面状态的单元格。
       * 将页面状态值映射为对应的中文标签，并根据状态显示不同样式的徽章。
       */
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
      /**
       * 渲染发表时间的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
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
      /**
       * 渲染最后更新日期的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
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
