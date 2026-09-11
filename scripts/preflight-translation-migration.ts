import { createClient } from "@libsql/client";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sanitizedTarget(value: string): string {
  const url = new URL(value);
  return `${url.protocol}//${url.hostname}`;
}

async function scalar(
  client: ReturnType<typeof createClient>,
  sql: string,
): Promise<number> {
  const result = await client.execute(sql);
  return Number(result.rows[0]?.value ?? 0);
}

const url = required("TURSO_URL");
const client = createClient({ url, authToken: required("TURSO_TOKEN") });

try {
  const tableRows = await client.execute(
    "select name from sqlite_master where type = 'table' order by name",
  );
  const tables = tableRows.rows.map((row) => String(row.name));
  const columns: Record<string, string[]> = Object.fromEntries(
    await Promise.all(
      ["category", "post", "page", "setting", "tag"].map(async (table) => {
        const result = await client.execute(`pragma table_info(${table})`);
        return [table, result.rows.map((row) => String(row.name))];
      }),
    ),
  );
  const counts = Object.fromEntries(
    await Promise.all(
      ["category", "post", "page", "setting", "tag"].map(async (table) => [
        table,
        await scalar(client, `select count(*) as value from ${table}`),
      ]),
    ),
  );
  const ledger = tables.includes("__drizzle_migrations")
    ? await client.execute(
        'select id, hash, created_at from "__drizzle_migrations" order by created_at',
      )
    : null;
  const translationTables = [
    "category_translation",
    "post_translation",
    "page_translation",
    "setting_translation",
    "tag_translation",
  ];
  const normalized = translationTables.every((table) => tables.includes(table));
  const invalid = normalized
    ? null
    : {
        category: await scalar(
          client,
          `select count(*) as value from category where
      case when json_valid(title) = 1 and json_type(title) = 'object'
        and json_type(title, '$.en') = 'text' and trim(json_extract(title, '$.en')) <> ''
        and json_type(title, '$.zh') = 'text' and trim(json_extract(title, '$.zh')) <> ''
        and json_valid(description) = 1 and json_type(description) = 'object'
        and json_type(description, '$.en') = 'text' and trim(json_extract(description, '$.en')) <> ''
        and json_type(description, '$.zh') = 'text' and trim(json_extract(description, '$.zh')) <> ''
      then 0 else 1 end = 1`,
        ),
        page: await scalar(
          client,
          `select count(*) as value from page where
      case when json_valid(title) = 1 and json_type(title) = 'object'
        and json_type(title, '$.en') = 'text' and trim(json_extract(title, '$.en')) <> ''
        and json_type(title, '$.zh') = 'text' and trim(json_extract(title, '$.zh')) <> ''
        and json_valid(content) = 1 and json_type(content) = 'object'
        and json_type(content, '$.en') = 'text' and trim(json_extract(content, '$.en')) <> ''
        and json_type(content, '$.zh') = 'text' and trim(json_extract(content, '$.zh')) <> ''
      then 0 else 1 end = 1`,
        ),
        tag: await scalar(
          client,
          `select count(*) as value from tag where
      case when json_valid(name) = 1 and json_type(name) = 'object'
        and json_type(name, '$.en') = 'text' and trim(json_extract(name, '$.en')) <> ''
        and json_type(name, '$.zh') = 'text' and trim(json_extract(name, '$.zh')) <> ''
      then 0 else 1 end = 1`,
        ),
        post: await scalar(
          client,
          `select count(*) as value from post where
      case when (title is null or (json_valid(title) = 1 and json_type(title) = 'object'))
        and (content is null or (json_valid(content) = 1 and json_type(content) = 'object'))
        and (excerpt is null or (json_valid(excerpt) = 1 and json_type(excerpt) = 'object'))
        and (gallery_location is null or (json_valid(gallery_location) = 1 and json_type(gallery_location) = 'object'))
        and (quote_author is null or (json_valid(quote_author) = 1 and json_type(quote_author) = 'object'))
        and (quote_content is null or (json_valid(quote_content) = 1 and json_type(quote_content) = 'object'))
      then 0 else 1 end = 1`,
        ),
        setting: await scalar(
          client,
          `select count(*) as value from setting where
      case when json_valid(site_name) = 1 and json_type(site_name) = 'object'
        and json_valid(site_sub_name) = 1 and json_type(site_sub_name) = 'object'
        and json_valid(site_signature) = 1 and json_type(site_signature) = 'object'
        and json_valid(site_copyright) = 1 and json_type(site_copyright) = 'object'
      then 0 else 1 end = 1`,
        ),
      };
  const normalizedAudit = normalized
    ? {
        translationCounts: Object.fromEntries(
          await Promise.all(
            translationTables.map(async (table) => [
              table,
              await scalar(client, `select count(*) as value from ${table}`),
            ]),
          ),
        ),
        requiredMissing: {
          category: await scalar(
            client,
            `select count(*) as value from category
            where (select count(*) from category_translation where category_id = category.id) <> 2`,
          ),
          page: await scalar(
            client,
            `select count(*) as value from page
            where (select count(*) from page_translation where page_id = page.id) <> 2`,
          ),
          tag: await scalar(
            client,
            `select count(*) as value from tag
            where (select count(*) from tag_translation where tag_id = tag.id) <> 2`,
          ),
        },
        orphans: {
          category: await scalar(
            client,
            `select count(*) as value from category_translation
            where category_id not in (select id from category)`,
          ),
          post: await scalar(
            client,
            `select count(*) as value from post_translation
            where post_id not in (select id from post)`,
          ),
          page: await scalar(
            client,
            `select count(*) as value from page_translation
            where page_id not in (select id from page)`,
          ),
          setting: await scalar(
            client,
            `select count(*) as value from setting_translation
            where setting_id not in (select id from setting)`,
          ),
          tag: await scalar(
            client,
            `select count(*) as value from tag_translation
            where tag_id not in (select id from tag)`,
          ),
        },
        legacyColumnsRemaining: Object.fromEntries(
          Object.entries({
            category: ["description", "title"],
            post: [
              "gallery_location",
              "content",
              "excerpt",
              "title",
              "quote_author",
              "quote_content",
            ],
            page: ["content", "title"],
            setting: [
              "site_name",
              "site_sub_name",
              "site_signature",
              "site_copyright",
            ],
            tag: ["name"],
          }).map(([table, legacy]) => [
            table,
            (columns[table] ?? []).filter((column) => legacy.includes(column)),
          ]),
        ),
        integrity: (await client.execute("pragma integrity_check")).rows,
      }
    : null;

  process.stdout.write(
    `${JSON.stringify(
      {
        target: sanitizedTarget(url),
        tables,
        columns,
        counts,
        ledger: ledger?.rows ?? null,
        invalid,
        normalizedAudit,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  client.close();
}
