import "server-only";
import { getTableColumns } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/lib/db/db";
import { media } from "@/lib/db/schema/content-media";
import { ApplicationError } from "@/lib/errors/application-error";

const TableInfoSchema = z.array(z.object({ name: z.string().min(1) }));
const expectedColumns = new Set(
  Object.values(getTableColumns(media)).map((column) => column.name),
);

/** Technical deployment guard only; never reads or interprets persisted media rows. */
export async function assertOrdinaryMediaSchema(db: Pick<Database, "all">) {
  const unavailable = () =>
    new ApplicationError(
      "SERVICE_UNAVAILABLE",
      "媒体数据库结构尚未就绪，请联系管理员完成部署后重试",
    );
  let result: unknown;
  try {
    result = await db.all("PRAGMA table_info(media)");
  } catch {
    throw unavailable();
  }
  const parsed = TableInfoSchema.safeParse(result);
  if (!parsed.success) throw unavailable();
  const columns = new Set(parsed.data.map((column) => column.name));
  if (
    parsed.data.length !== expectedColumns.size ||
    columns.size !== expectedColumns.size ||
    [...columns].some((name) => !expectedColumns.has(name))
  )
    throw unavailable();
}
