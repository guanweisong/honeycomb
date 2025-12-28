import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/app/admin/components/MultiLangText";
import { MultiLang } from "@/packages/types/multi.lang";
import { creatCategoryTitleByDepth } from "@/lib/help";
import { EnableStatusName, EnableStatus } from "@/packages/types/enable.status";
import { CategoryEntity } from "@/packages/trpc/server/types/category.entity";

/**
 * 分类列表的表格列定义。
 * 定义了分类管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
const categoryListTableColumns: ColumnDef<CategoryEntity>[] = [
  {
    accessorKey: "title",
    header: "分类名称",
    cell: ({ row }) => {
      /**
       * 渲染分类名称的单元格。
       * 根据分类的深度添加前缀，并显示多语言标题。
       */
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
      /**
       * 渲染分类描述的单元格。
       * 显示多语言描述。
       */
      const description = row.getValue("description") as MultiLang;
      return <MultiLangText text={description} />;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      /**
       * 渲染状态的单元格。
       * 将状态值映射为对应的中文名称。`
       */
      const status = row.getValue("status") as EnableStatus;
      return EnableStatusName[status];
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
];
export default categoryListTableColumns;
