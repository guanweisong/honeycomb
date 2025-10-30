import MultiLangText from "@/components/MultiLangText";
import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import { TagEntity } from "@honeycomb/trpc/server/types/tag.entity";

/**
 * 标签列表的表格列定义。
 * 定义了标签管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
export const tagTableColumns: ColumnDef<TagEntity>[] = [
  {
    accessorKey: "name",
    header: "标签名称",
    cell: ({ row }) => {
      /**
       * 渲染标签名称的单元格。
       * 显示多语言标签名称。
       */
      return <MultiLangText text={row.getValue("name")} />;
    },
  },
  {
    accessorKey: "createdAt",
    header: "添加时间",
    enableSorting: true,
    cell: ({ row }) => {
      /**
       * 渲染创建时间的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
      return dayjs(row.getValue("createdAt")).format("YYYY-MM-DD HH:mm:ss");
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
      return dayjs(row.getValue("updatedAt")).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
