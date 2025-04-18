import {
  CategoryReadOnly,
  PostEntity,
  UserReadOnly,
} from "@/src/app/(root)/(dashboard)/post/types/post.entity";
import MultiLangText from "@/src/components/MultiLangText";
import { MultiLang } from "@/src/types/MulitLang";
import { SortOrder } from "@/src/types/SortOrder";
import type { ProColumns } from "@ant-design/pro-components";
import { Popconfirm } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { postStatusOptions } from "../../types/PostStatus";
import { postTypeOptions } from "../../types/PostType";

export interface PostListTableColumnsProps {
  handleDeleteItem: (id: string[]) => void;
}

export const PostListTableColumns = (props: PostListTableColumnsProps) =>
  [
    {
      title: "文章名称",
      dataIndex: "title",
      key: "title",
      width: 200,
      render: (text: MultiLang) => <MultiLangText text={text} />,
    },
    {
      title: "引用内容",
      dataIndex: "quoteContent",
      key: "quoteContent",
      search: false,
      width: 200,
      render: (text: MultiLang) => <MultiLangText text={text} />,
    },
    {
      title: "分类",
      dataIndex: "category",
      key: "category",
      search: false,
      width: 120,
      render: (text: CategoryReadOnly) => <MultiLangText text={text.title} />,
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 70,
      valueType: "select",
      fieldProps: {
        mode: "multiple",
        options: postTypeOptions,
      },
    },
    {
      title: "作者",
      dataIndex: "author",
      key: "author",
      search: false,
      width: 80,
      render: (text: UserReadOnly) => text.name,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      valueType: "select",
      width: 70,
      fieldProps: {
        mode: "multiple",
        options: postStatusOptions,
      },
    },
    {
      title: "发表时间",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: true,
      defaultSortOrder: SortOrder.descend,
      search: false,
      width: 180,
      render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "最后更新日期",
      dataIndex: "updatedAt",
      key: "updatedAt",
      sorter: true,
      search: false,
      width: 180,
      render: (text: string) => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "点击量",
      dataIndex: "views",
      key: "views",
      search: false,
      sorter: true,
      width: 80,
    },
    {
      title: "操作",
      key: "operation",
      search: false,
      width: 80,
      fixed: "right",
      render: (_text, record) => (
        <p>
          <Link href={`/post/edit?id=${record.id}`}>编辑</Link>&nbsp;
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => props.handleDeleteItem([record.id])}
          >
            <a>删除</a>
          </Popconfirm>
        </p>
      ),
    },
  ] as ProColumns<PostEntity>[];
