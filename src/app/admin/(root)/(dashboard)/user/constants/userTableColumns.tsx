import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { UserEntity } from "@/packages/trpc/api/modules/user/types/user.entity";
import { userLevelOptions } from "@/packages/trpc/api/modules/user/types/user.level";
import { userStatusOptions } from "@/packages/trpc/api/modules/user/types/user.status";
import {
  StatusBadge,
  StatusBadgeTone,
} from "@/packages/ui/extended/StatusBadge";

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
       * 将用户状态值映射为对应的中文标签，并使用颜色徽章展示。
      */
      const status = row.getValue("status") as string;
      const label = userStatusOptions.find((opt) => opt.value === status)?.label ?? status;
      const tone = getUserStatusTone(status);
      return <StatusBadge tone={tone} label={label} />;
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
      return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
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
      return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
    },
  },
];

function getUserStatusTone(status: string) {
  switch (status) {
    case "ENABLE":
      return StatusBadgeTone.GREEN;
    case "DISABLE":
      return StatusBadgeTone.RED;
    case "DELETED":
    default:
      return StatusBadgeTone.GRAY;
  }
}
