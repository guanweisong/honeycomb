import { createClient, type Client } from "@libsql/client";
import { CommentStatus } from "@/packages/domain/content/comment";
import { PageStatus } from "@/packages/domain/content/page";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { PostType } from "@/packages/domain/content/post";
import { PostStatus } from "@/packages/domain/content/post-status";
import { TagType } from "@/packages/domain/content/tag";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";
import { loginHistoryEvents } from "@/packages/identity/account-security/login-history-events";
import { MenuType } from "@/packages/domain/navigation/menu";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

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
  ["category", "status", `status not in (${sqlValues(Object.values(EnableStatus))})`],
  ["post", "status", `status not in (${sqlValues(Object.values(PostStatus))})`],
  ["post", "type", `type not in (${sqlValues(Object.values(PostType))})`],
  ["post", "comment_status", `comment_status not in (${sqlValues(Object.values(EnableStatus))})`],
  ["post", "views", "views < 0"],
  ["page", "status", `status not in (${sqlValues(Object.values(PageStatus))})`],
  ["page", "template", `template not in (${sqlValues(Object.values(PageTemplate))})`],
  ["page", "views", "views < 0"],
  ["comment", "status", `status not in (${sqlValues(Object.values(CommentStatus))})`],
  ["comment", "target", "(post_id is not null) + (page_id is not null) + (custom_id is not null) <> 1"],
  ["media", "size", "size < 0"],
  ["media", "width", "width < 0"],
  ["media", "height", "height < 0"],
  ["menu", "type", `type not in (${sqlValues(Object.values(MenuType))})`],
  ["post_tag", "type", `type not in (${sqlValues(Object.values(TagType))})`],
  ["link", "status", `status not in (${sqlValues(Object.values(EnableStatus))})`],
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
    if (count > 0) violations.push({ table: "setting", field: "singleton", count });
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
