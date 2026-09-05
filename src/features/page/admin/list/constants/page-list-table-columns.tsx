import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/packages/ui/admin/MultiLangText";
import { Badge } from "@/packages/ui/components/badge";
import { pageStatusOptions } from "@/packages/domain/content/page";
import { pageTemplateOptions } from "@/packages/domain/content/page-template";
import type { PageViewModel as PageEntity } from "../../../presentation/page-view-model";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";
import { getStatusBadgeTone } from "@/packages/ui/extended/StatusBadge/status-tone";

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
          tone={getStatusBadgeTone(status, pageStatusToneMap)}
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
    header: "发表时间",
    enableSorting: true,
    cell: ({ row }) => {
      /**
       * 渲染发表时间的单元格。
       * 格式化日期为 "YYYY-MM-DD HH:mm:ss"。
       */
      const value = row.original.createdAt;
      return (
        <span className="whitespace-nowrap">
          {value ? format(new Date(value), "yyyy-MM-dd HH:mm:ss") : "-"}
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
      const value = row.original.updatedAt;
      return (
        <span className="whitespace-nowrap">
          {value ? format(new Date(value), "yyyy-MM-dd HH:mm:ss") : "-"}
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

const pageStatusToneMap = {
  PUBLISHED: StatusBadgeTone.GREEN,
  DRAFT: StatusBadgeTone.GRAY,
  TO_AUDIT: StatusBadgeTone.AMBER,
} as const;
