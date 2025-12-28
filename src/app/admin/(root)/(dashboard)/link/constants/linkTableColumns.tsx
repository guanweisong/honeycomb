import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import { enableStatusOptions } from "@/packages/types/enable.status";
import { LinkEntity } from "@/packages/trpc/server/types/link.entity";

/**
 * 友情链接列表的表格列定义。
 * 定义了友情链接管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
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
      filterOptions: enableStatusOptions,
    },
    cell: ({ row }) => {
      /**
       * 渲染链接状态的单元格。
       * 将链接状态值映射为对应的中文标签。
       */
      const status = row.getValue("status");
      return enableStatusOptions.find((opt) => opt.value === status)?.label;
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
      /**
       * 渲染创建时间的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
      const value: string = row.getValue("createdAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
