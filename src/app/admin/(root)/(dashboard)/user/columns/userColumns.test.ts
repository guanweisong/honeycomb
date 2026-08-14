import { describe, expect, it } from "vitest";

import { UserStatus } from "@/packages/domain/identity/user";
import { StatusBadgeTone } from "@/packages/ui/extended/StatusBadge";

import {
  formatUserDate,
  getUserStatusPresentation,
  userTableColumns,
} from "./userColumns";

describe("user columns", () => {
  it("keeps the visible column order, labels, and sortable timestamps", () => {
    expect(
      userTableColumns.map((column) => ({
        accessorKey: "accessorKey" in column ? column.accessorKey : undefined,
        header: column.header,
        enableSorting: column.enableSorting,
      })),
    ).toEqual([
      { accessorKey: "name", header: "用户名", enableSorting: undefined },
      { accessorKey: "level", header: "级别", enableSorting: undefined },
      { accessorKey: "status", header: "状态", enableSorting: undefined },
      { accessorKey: "email", header: "用户邮箱", enableSorting: undefined },
      { accessorKey: "createdAt", header: "添加时间", enableSorting: true },
      { accessorKey: "updatedAt", header: "最后更新日期", enableSorting: true },
    ]);
  });

  it("maps known and unknown statuses to the existing badge presentation", () => {
    expect(getUserStatusPresentation(UserStatus.ENABLE)).toEqual({
      label: "启用",
      tone: StatusBadgeTone.GREEN,
    });
    expect(getUserStatusPresentation(UserStatus.DISABLE)).toEqual({
      label: "禁用",
      tone: StatusBadgeTone.RED,
    });
    expect(getUserStatusPresentation("UNKNOWN")).toEqual({
      label: "UNKNOWN",
      tone: StatusBadgeTone.GRAY,
    });
  });

  it("renders a placeholder when a user timestamp is empty or invalid", () => {
    expect(formatUserDate(null)).toBe("-");
    expect(formatUserDate("not-a-date")).toBe("-");
  });
});
