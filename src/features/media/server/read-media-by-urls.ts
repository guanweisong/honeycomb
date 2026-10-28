import "server-only";
import { inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { SQL_ID_CHUNK_SIZE } from "@/lib/db/query/parameter-limits";
import { observeDbOperation } from "@/lib/observability/server";
import type { DatabaseQueryName } from "@/lib/observability/server/database-operation";

/** Keep SQL bindings bounded without truncating localized content image URLs. */
export async function readMediaByUrls(
  db: Database,
  urls: string[],
  operation: DatabaseQueryName,
) {
  const images: (typeof schema.media.$inferSelect)[] = [];
  for (let offset = 0; offset < urls.length; offset += SQL_ID_CHUNK_SIZE) {
    images.push(
      ...(await observeDbOperation(operation, "select", () =>
        db
          .select()
          .from(schema.media)
          .where(
            inArray(
              schema.media.url,
              urls.slice(offset, offset + SQL_ID_CHUNK_SIZE),
            ),
          ),
      )),
    );
  }
  return images;
}
