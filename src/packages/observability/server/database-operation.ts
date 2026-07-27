import "server-only";

import { MetricName } from "../core/names";
import { getMetrics } from "./registry";

export type DatabaseOperation =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "transaction";

export const databaseQueryNames = [
  "auth.context-user",
  "auth.credentials-user",
  "auth.oauth-user.create",
  "auth.user-by-email",
  "category.create",
  "category.destroy",
  "category.list",
  "category.service.count",
  "category.service.list",
  "category.update",
  "comment.create",
  "comment.notification.detail",
  "comment.notification.setting",
  "comment.service.count",
  "comment.service.create",
  "comment.service.custom-posts",
  "comment.service.destroy",
  "comment.service.ids",
  "comment.service.list",
  "comment.service.public-count",
  "comment.service.public-list",
  "comment.service.update",
  "comment.target.page",
  "comment.target.parent",
  "comment.target.post",
  "link.create",
  "link.destroy",
  "link.service.count",
  "link.service.list",
  "link.update",
  "media.count",
  "media.create",
  "media.destroy.delete",
  "media.destroy.select",
  "media.list",
  "menu.save-all",
  "menu.service.categories",
  "menu.service.list",
  "menu.service.pages",
  "page.create",
  "page.destroy",
  "page.increment-views",
  "page.service.author",
  "page.service.count",
  "page.service.detail",
  "page.service.detail-images",
  "page.service.images",
  "page.service.list",
  "page.service.relations",
  "page.update",
  "post.category-id",
  "post.create",
  "post.destroy",
  "post.increment-views",
  "post.random-by-category",
  "post.service.category-tree",
  "post.service.count",
  "post.service.detail",
  "post.service.detail-images",
  "post.service.ids-by-tag",
  "post.service.list",
  "post.service.relations",
  "post.update",
  "post.update-tags",
  "setting.get",
  "setting.update",
  "statistics.comments-by-status",
  "statistics.posts-by-author",
  "statistics.posts-by-type",
  "statistics.user-list",
  "statistics.users-by-level",
  "tag.count",
  "tag.create",
  "tag.destroy",
  "tag.list",
  "tag.relations",
  "tag.update",
  "user.count",
  "user.create",
  "user.current",
  "user.destroy",
  "user.detail",
  "user.list",
  "user.update",
] as const;

export type DatabaseQueryName = (typeof databaseQueryNames)[number];

const databaseQueryNameCatalog = new Set<string>(databaseQueryNames);

export async function observeDbOperation<T>(
  queryName: DatabaseQueryName,
  operation: DatabaseOperation,
  execute: () => Promise<T>,
): Promise<T> {
  if (!databaseQueryNameCatalog.has(queryName)) return execute();

  const startedAt = performance.now();
  let outcome = "success";

  try {
    return await execute();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    const labels = { queryName, operation, outcome };
    const metrics = getMetrics();
    metrics.increment(MetricName.databaseOperationsTotal, labels);
    if (outcome === "error") {
      metrics.increment(MetricName.databaseErrorsTotal, labels);
    }
    metrics.recordDuration(
      MetricName.databaseOperationDurationMs,
      performance.now() - startedAt,
      labels,
    );
  }
}
