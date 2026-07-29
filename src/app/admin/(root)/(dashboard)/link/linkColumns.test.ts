import { describe, expect, it } from "vitest";

import { StatusBadgeTone } from "@/packages/ui/extended/StatusBadge";

import { getLinkStatusPresentation, linkTableColumns } from "./linkColumns";

describe("link columns", () => {
  it("keeps the visible column order and labels", () => {
    expect(
      linkTableColumns.map((column) => ({
        accessorKey: "accessorKey" in column ? column.accessorKey : undefined,
        header: column.header,
      })),
    ).toEqual([
      { accessorKey: "name", header: "链接名称" },
      { accessorKey: "url", header: "URL" },
      { accessorKey: "status", header: "状态" },
      { accessorKey: "description", header: "链接描述" },
      { accessorKey: "createdAt", header: "添加时间" },
    ]);
  });

  it("maps enabled, disabled, and unknown statuses to the existing badge presentation", () => {
    expect(getLinkStatusPresentation("ENABLE")).toEqual({
      label: "启用",
      tone: StatusBadgeTone.GREEN,
    });
    expect(getLinkStatusPresentation("DISABLE")).toEqual({
      label: "禁用",
      tone: StatusBadgeTone.RED,
    });
    expect(getLinkStatusPresentation("UNKNOWN")).toEqual({
      label: "UNKNOWN",
      tone: StatusBadgeTone.RED,
    });
  });
});
