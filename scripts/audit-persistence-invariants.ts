import { createClient, type Client } from "@libsql/client";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { PostType } from "@/features/post/types/post.type";
import { PostStatus } from "@/features/post/types/post.status";
import { TagType } from "@/features/tag/types/tag.type";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { loginHistoryEvents } from "@/features/user/account-security/login-history-events";
import { MenuType } from "@/features/menu/types/menu.type";
import { EnableStatus } from "@/lib/validation/enable-status";

export type PersistenceInvariantViolation = {
  table: string;
  field: string;
  count: number;
};

type AuditClient = Pick<Client, "execute">;

function sqlValues(values: readonly string[]): string {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");
}

const rules = [
  [
    "category",
    "status",
    `status not in (${sqlValues(Object.values(EnableStatus))})`,
  ],
  ["post", "status", `status not in (${sqlValues(Object.values(PostStatus))})`],
  ["post", "type", `type not in (${sqlValues(Object.values(PostType))})`],
  [
    "post",
    "comment_status",
    `comment_status not in (${sqlValues(Object.values(EnableStatus))})`,
  ],
  ["post", "views", "views < 0"],
  ["page", "status", `status not in (${sqlValues(Object.values(PageStatus))})`],
  [
    "page",
    "template",
    `template not in (${sqlValues(Object.values(PageTemplate))})`,
  ],
  ["page", "views", "views < 0"],
  [
    "comment",
    "status",
    `status not in (${sqlValues(Object.values(CommentStatus))})`,
  ],
  [
    "comment",
    "target",
    "(post_id is not null) + (page_id is not null) + (custom_id is not null) <> 1",
  ],
  ["media", "size", "size < 0"],
  ["media", "width", "width < 0"],
  ["media", "height", "height < 0"],
  ["menu", "type", `type not in (${sqlValues(Object.values(MenuType))})`],
  ["post_tag", "type", `type not in (${sqlValues(Object.values(TagType))})`],
  [
    "link",
    "status",
    `status not in (${sqlValues(Object.values(EnableStatus))})`,
  ],
  ["user", "level", `level not in (${sqlValues(Object.values(UserLevel))})`],
  ["user", "status", `status not in (${sqlValues(Object.values(UserStatus))})`],
  ["login_history", "event", `event not in (${sqlValues(loginHistoryEvents)})`],
] as const;

/** 只读审计现有数据；结果只暴露表、字段和数量。 */
export async function findPersistenceInvariantViolations(
  client: AuditClient,
): Promise<PersistenceInvariantViolation[]> {
  const tableRows = await client.execute(
    "select name from sqlite_master where type = 'table'",
  );
  const tables = new Set(tableRows.rows.map((row) => String(row.name)));
  const violations: PersistenceInvariantViolation[] = [];
  for (const [table, field, predicate] of rules) {
    if (!tables.has(table)) continue;
    const result = await client.execute(
      `select count(*) as count from "${table}" where ${predicate}`,
    );
    const count = Number(result.rows[0]?.count ?? 0);
    if (count > 0) violations.push({ table, field, count });
  }
  if (tables.has("setting")) {
    const result = await client.execute(
      "select max(count(*) - 1, 0) as count from setting",
    );
    const count = Number(result.rows[0]?.count ?? 0);
    if (count > 0)
      violations.push({ table: "setting", field: "singleton", count });
  }
  // Forward-only guard for databases that still have the legacy JSON columns.
  // CASE prevents malformed JSON from reaching json_type/json_extract.
  for (const [table, fields] of Object.entries({
    post: [
      "title",
      "content",
      "excerpt",
      "gallery_location",
      "quote_author",
      "quote_content",
    ],
    setting: ["site_name", "site_sub_name", "site_signature", "site_copyright"],
  })) {
    if (!tables.has(table)) continue;
    const columns = await client.execute(`pragma table_info("${table}")`);
    const names = new Set(columns.rows.map((row) => String(row.name)));
    for (const field of fields) {
      if (!names.has(field)) continue;
      const result =
        await client.execute(`select count(*) as count from "${table}" where
        case when "${field}" is null then 0
          when json_valid("${field}") <> 1 then 1
          when json_type("${field}") <> 'object' then 1
          when coalesce(json_type("${field}", '$.en'), 'null') not in ('text', 'null') then 1
          when coalesce(json_type("${field}", '$.zh'), 'null') not in ('text', 'null') then 1
          else 0 end = 1`);
      const count = Number(result.rows[0]?.count ?? 0);
      if (count > 0) violations.push({ table, field, count });
    }
  }
  return violations;
}

async function main() {
  const url = process.env.TURSO_URL;
  if (!url) throw new Error("TURSO_URL is required");
  const client = createClient({ url, authToken: process.env.TURSO_TOKEN });
  try {
    const violations = await findPersistenceInvariantViolations(client);
    if (violations.length > 0) {
      process.stdout.write(`${JSON.stringify(violations)}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write("Persistence invariant audit passed.\n");
  } finally {
    client.close();
  }
}

if (import.meta.main) await main();
