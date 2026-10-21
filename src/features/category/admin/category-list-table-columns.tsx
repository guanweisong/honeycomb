import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/admin/MultiLangText";
import { renderCategoryTitleByDepth } from "@/features/category/admin/category-title";
import type { CategoryListItem as CategoryEntity } from "@/features/category/types";
import { StatusBadge, StatusBadgeTone } from "@/components/StatusBadge";
import { getStatusBadgeTone } from "@/components/StatusBadge/status-tone";
import { formatAdminDateTime } from "@/components/admin/date-time";

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
      const title = row.original.title;
      const record = row.original;
      return renderCategoryTitleByDepth(<MultiLangText text={title} />, record);
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
      const description = row.original.description;
      return <MultiLangText text={description} />;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      /**
       * 渲染状态的单元格。
       * 将状态值映射为对应的中文名称，并使用颜色徽章展示。
       */
      const status = row.original.status;
      const toneMap = {
        ENABLE: StatusBadgeTone.GREEN,
        DISABLE: StatusBadgeTone.RED,
      } as const;
      return (
        <StatusBadge
          tone={getStatusBadgeTone(status, toneMap)}
          label={status === "ENABLE" ? "启用" : "禁用"}
        />
      );
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
      const value = row.original.createdAt;
      return (
        <span className="whitespace-nowrap">{formatAdminDateTime(value)}</span>
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
      const value = row.original.updatedAt;
      return (
        <span className="whitespace-nowrap">{formatAdminDateTime(value)}</span>
      );
    },
  },
];
export default categoryListTableColumns;
