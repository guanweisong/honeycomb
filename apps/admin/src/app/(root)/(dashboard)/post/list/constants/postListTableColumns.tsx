import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import MultiLangText from "@/components/MultiLangText";
import { MultiLang } from "@/types/MulitLang";
import {
  CategoryReadOnly,
  PostEntity,
  UserReadOnly,
} from "@/app/(root)/(dashboard)/post/types/post.entity";
import { postStatusOptions } from "../../types/PostStatus";
import { postTypeOptions } from "../../types/PostType";
import { Badge } from "@honeycomb/ui/components/badge";

export const postListTableColumns: ColumnDef<PostEntity>[] = [
  {
    accessorKey: "title",
    header: "文章名称",
    cell: ({ row }) => {
      const title = row.getValue("title") as MultiLang;
      return <MultiLangText text={title} />;
    },
  },
  {
    accessorKey: "quoteContent",
    header: "引用内容",
    cell: ({ row }) => {
      const quote = row.getValue("quoteContent") as MultiLang;
      return <MultiLangText text={quote} />;
    },
  },
  {
    accessorKey: "category",
    header: "分类",
    cell: ({ row }) => {
      const category = row.getValue("category") as CategoryReadOnly;
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
      const type = row.getValue("type") as string;
      return postTypeOptions.find((opt) => opt.value === type)?.label ?? type;
    },
  },
  {
    accessorKey: "author",
    header: "作者",
    cell: ({ row }) => {
      const author = row.getValue("author") as UserReadOnly;
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
