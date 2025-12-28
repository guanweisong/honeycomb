import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/app/admin/components/MultiLangText";
import { MultiLang } from "@/packages/types/multi.lang";
import { Badge } from "@/packages/ui/components/badge";
import { PostListItemEntity } from "@/packages/trpc/server/types/post.entity";
import { postStatusOptions } from "@/packages/types/post/post.status";
import { postTypeOptions } from "@/packages/types/post/post.type";

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
      const title = row.getValue("title") as MultiLang;
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
      const quote = row.getValue("quoteContent") as MultiLang;
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
      const category = row.getValue("category");
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
      const type = row.getValue("type") as string;
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
      const author = row.getValue("author");
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
      const status = row.getValue("status") as string;
      const label =
        postStatusOptions.find((opt) => opt.value === status)?.label ?? status;
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
