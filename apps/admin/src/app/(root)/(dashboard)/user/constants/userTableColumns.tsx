import dayjs from "dayjs";
import { ColumnDef } from "@tanstack/react-table";
import { UserEntity } from "@honeycomb/validation/user/schemas/user.entity.schema";
import { userLevelOptions, userStatusOptions } from "@honeycomb/db/src/types";

/**
 * 用户列表的表格列定义。
 * 定义了用户管理页面中 `DataTable` 组件的每一列的显示方式和数据源。
 */
export const userTableColumns: ColumnDef<UserEntity>[] = [
  {
    accessorKey: "name",
    header: "用户名",
  },
  {
    accessorKey: "level",
    header: "级别",
    meta: {
      filterOptions: userLevelOptions,
    },
    cell: ({ row }) => {
      /**
       * 渲染用户级别的单元格。
       * 将用户级别值映射为对应的中文标签。
       */
      const level = row.getValue("level") as string;
      return userLevelOptions.find((opt) => opt.value === level)?.label;
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    meta: {
      filterOptions: userStatusOptions,
    },
    cell: ({ row }) => {
      /**
       * 渲染用户状态的单元格。
       * 将用户状态值映射为对应的中文标签。
       */
      const status = row.getValue("status") as string;
      return userStatusOptions.find((opt) => opt.value === status)?.label;
    },
  },
  {
    accessorKey: "email",
    header: "用户邮箱",
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
      const value: string = row.getValue("createdAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
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
      const value: string = row.getValue("updatedAt");
      return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
    },
  },
];
