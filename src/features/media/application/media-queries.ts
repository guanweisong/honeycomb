import "server-only";

import type { MediaRepository } from "../infrastructure/media-repository";

type QueryRecord = Record<
  string,
  string | number | boolean | Array<string | number | boolean> | undefined
>;

/** 查询媒体列表。 */
export function getMediaList(
  repository: MediaRepository,
  input: {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  } & QueryRecord,
) {
  return repository.list(input);
}
