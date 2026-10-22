// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { getStatistics } from "@/features/dashboard/server/dashboard-queries";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
let directory: string | undefined;
let client: Client | undefined;
afterEach(() => {
  client?.close();
  client = undefined;
  if (directory) {
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
    directory = undefined;
  }
});
it("aggregates actual SQLite rows in five queries with enum ordering and missing counts", async () => {
  directory = mkdtempSync(join(tmpdir(), "honeycomb-statistics-"));
  expect(lstatSync(directory).isSymbolicLink()).toBe(false);
  if (process.getuid) expect(lstatSync(directory).uid).toBe(process.getuid());
  const databasePath = resolve(directory, "statistics.db");
  expect(dirname(databasePath)).toBe(directory);
  client = createClient({ url: `file:${databasePath}` });
  for (const file of readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort())
    await client.executeMultiple(readFileSync(join("drizzle", file), "utf8"));
  await client.execute(
    "INSERT INTO user(id,name,email,level) VALUES ('author','Author','author@example.test','ADMIN'), ('unnamed',NULL,'guest@example.test','GUEST')",
  );
  await client.execute(
    "INSERT INTO category(id,path) VALUES ('category','category')",
  );
  await client.execute(
    "INSERT INTO post(id,author_id,category_id,type) VALUES ('one','author','category','ARTICLE'), ('two','author','category','ARTICLE'), ('three','author','category','MOVIE')",
  );
  await client.execute(
    "INSERT INTO comment(id,author,email,content,post_id,status) VALUES ('comment','Visitor','visitor@example.test','Comment','one','PUBLISH')",
  );
  const queries: string[] = [];
  const db = drizzle(client, {
    schema,
    logger: {
      logQuery: (query) => {
        queries.push(query);
      },
    },
  });
  const result = await getStatistics(db);
  expect(result).toEqual({
    postType: [
      { item: "ARTICLE", count: 2 },
      { item: "MOVIE", count: 1 },
      { item: "PHOTOGRAPH", count: 0 },
      { item: "QUOTE", count: 0 },
    ],
    userType: [
      { item: "ADMIN", count: 1 },
      { item: "EDITOR", count: 0 },
      { item: "GUEST", count: 1 },
    ],
    commentStatus: [
      { item: "TO_AUDIT", count: 0 },
      { item: "PUBLISH", count: 1 },
      { item: "RUBBISH", count: 0 },
      { item: "BAN", count: 0 },
    ],
    userPost: [
      { item: "Author", count: 3 },
      { item: "unnamed", count: 0 },
    ],
  });
  expect(queries).toHaveLength(5);
});
