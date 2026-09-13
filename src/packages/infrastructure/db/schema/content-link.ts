import { EnableStatus } from "@/packages/domain/shared/enable-status";
import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";
import { enumCheck } from "../constraint-helpers";

/**
 * 友情链接表 (link)
 * 存储友情链接信息。
 */
export const link = sqliteTable(
  "link",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    url: text("url").unique().notNull(),
    name: text("name").notNull(),
    logo: text("logo").notNull(), // 链接 Logo URL
    description: text("description"),
    status: text("status").default(EnableStatus.ENABLE), // 链接状态，默认启用
    ...withTimestamps(),
  },
  (table) => ({
    linkStatusIdx: index("link_status_idx").on(table.status),
    linkStatusCheck: enumCheck(
      "link_status_check",
      table.status,
      Object.values(EnableStatus),
    ),
  }),
);
