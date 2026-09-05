import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/packages/ui/admin/MultiLangText";
import type { PostListViewModel as PostListItemEntity } from "../../../presentation/post-view-model";
import { postStatusOptions } from "@/packages/domain/content/post-status";
import { postTypeOptions } from "@/packages/domain/content/post";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";
import { getStatusBadgeTone } from "@/packages/ui/extended/StatusBadge/status-tone";

/**
 * 文章列表的表格列定义。
 * 定义了文章管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
export const postListTableColumns: ColumnDef<PostListItemEntity>[] = [
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
    accessorKey: "quoteContent",
    header: "引用内容",
    cell: ({ row }) => {
      /**
       * 渲染引用内容的单元格。
       * 显示多语言引用内容，并限制宽度。
       */
      const quote = row.original.quoteContent;
      return (
        <div className="max-w-60 whitespace-normal">
          <MultiLangText text={quote} />
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "分类",
    cell: ({ row }) => {
      /**
       * 渲染分类名称的单元格。
       * 显示多语言分类名称，如果不存在则显示 "-"。
       */
      const category = row.original.category;
      return category?.title ? <MultiLangText text={category.title} /> : "-";
    },
  },
  {
    accessorKey: "type",
    header: "类型",
    meta: {
      filterOptions: postTypeOptions,
    },
    cell: ({ row }) => {
      /**
       * 渲染文章类型的单元格。
       * 将文章类型值映射为对应的中文标签。
       */
      const type = row.original.type;
      return postTypeOptions.find((opt) => opt.value === type)?.label ?? type;
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
      filterOptions: postStatusOptions,
    },
    cell: ({ row }) => {
      /**
       * 渲染文章状态的单元格。
       * 将文章状态值映射为对应的中文标签，并根据状态显示不同样式的徽章。
       */
      const status = row.original.status;
      const label =
        postStatusOptions.find((opt) => opt.value === status)?.label ?? status;
      return (
        <StatusBadge
          tone={getStatusBadgeTone(status, postStatusToneMap)}
          label={label}
        />
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

const postStatusToneMap = {
  PUBLISHED: StatusBadgeTone.GREEN,
  DRAFT: StatusBadgeTone.GRAY,
  TO_AUDIT: StatusBadgeTone.AMBER,
} as const;
