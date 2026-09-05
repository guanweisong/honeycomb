import {
  createTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { linkTableColumns } from "./link-columns";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

it("renders missing link creation dates without inventing an epoch date", () => {
  const table = createTable({
    data: [
      {
        id: "link",
        name: "Link",
        url: "https://example.com",
        logo: "",
        description: null,
        status: EnableStatus.ENABLE,
        createdAt: null,
        updatedAt: null,
      },
    ],
    columns: linkTableColumns,
    getCoreRowModel: getCoreRowModel(),
    state: {},
    onStateChange: () => {},
    renderFallbackValue: null,
  });
  const cell = table
    .getRowModel()
    .rows[0]?.getAllCells()
    .find((cell) => cell.column.id === "createdAt");
  if (!cell) throw new Error("Missing date cell");
  expect(
    renderToStaticMarkup(
      <>{flexRender(cell.column.columnDef.cell, cell.getContext())}</>,
    ),
  ).toBe("-");
});
