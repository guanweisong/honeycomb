import { expect, it } from "vitest";
import { pageListTableColumns } from "@/app/admin/(dashboard)/page/list/components/constants/page-list-table-columns";
it("labels page titles and creation dates accurately without changing the sort fields", () => {
  expect(
    pageListTableColumns.find(
      (column) => "accessorKey" in column && column.accessorKey === "title",
    )?.header,
  ).toBe("页面名称");
  expect(
    pageListTableColumns.find(
      (column) => "accessorKey" in column && column.accessorKey === "createdAt",
    ),
  ).toMatchObject({ header: "创建时间", enableSorting: true });
});
