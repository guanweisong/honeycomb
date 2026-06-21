import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/app/admin/components/MultiLangText";
import { MultiLang } from "@/packages/trpc/api/types/multi.lang";
import { Badge } from "@/packages/ui/components/badge";
import { pageStatusOptions } from "@/packages/trpc/api/modules/page/types/page.status";
import { pageTemplateOptions } from "@/packages/trpc/api/modules/page/types/page.template";
import { PageEntity } from "@/packages/trpc/api/modules/page/types/page.entity";
import { UserEntity } from "@/packages/trpc/api/modules/user/types/user.entity";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";
import { getStatusBadgeTone } from "@/packages/ui/extended/StatusBadge/statusTone";

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
      const author: UserEntity = row.getValue("author");
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
        <StatusBadge tone={getStatusBadgeTone(status, pageStatusToneMap)} label={label} />
      );
    },
  },
  {
    accessorKey: "template",
    header: "模板",
    cell: ({ row }) => {
      const template = row.getValue("template") as string;
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
      const value = row.getValue("createdAt") as string;
      return (
        <span className="whitespace-nowrap">
          {format(new Date(value), "yyyy-MM-dd HH:mm:ss")}
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
          {format(new Date(value), "yyyy-MM-dd HH:mm:ss")}
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
