import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import { Badge } from "@/components/ui/badge";
import {
  pageStatusOptions,
  pageTemplateOptions,
} from "@/app/admin/(dashboard)/page/options";
import type { PageListItem as PageEntity } from "@/features/page/types/page.read-model";
import { StatusBadge } from "@/components/StatusBadge";
import { getStatusBadgeTone } from "@/components/StatusBadge/status-tone";
import { formatAdminDateTime } from "@/lib/ui/admin-date-time";
import { publicationStatusToneMap } from "@/app/admin/(dashboard)/page/list/components/publication-status-tone";

/**
 * 页面列表的表格列定义。
 * 定义了页面管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
export const pageListTableColumns: ColumnDef<PageEntity>[] = [
  {
    accessorKey: "title",
    header: "页面名称",
    cell: ({ row }) => {
      /**
       * 渲染页面标题的单元格。
       * 显示多语言标题。
       */
      const title = row.original.title;
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
      const author = row.original.author;
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
      const status = row.original.status;
      const label =
        pageStatusOptions.find((opt) => opt.value === status)?.label ?? status;
      return (
        <StatusBadge
          tone={getStatusBadgeTone(status, publicationStatusToneMap)}
          label={label}
        />
      );
    },
  },
  {
    accessorKey: "template",
    header: "模板",
    cell: ({ row }) => {
      const template = row.original.template;
      return (
        <Badge variant="outline">
          {pageTemplateOptions.find((opt) => opt.value === template)?.label ??
            template}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
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
  {
    accessorKey: "views",
    header: "点击量",
    enableSorting: true,
  },
];
