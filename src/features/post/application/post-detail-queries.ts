import "server-only";
import type { PostQueryRepository, PostVisibility } from "../infrastructure/post-query-repository";
/** 查询文章详情。 */
export function getPostDetail(repository: PostQueryRepository, id: string, visibility: PostVisibility = "PUBLISHED_ONLY") { return repository.detail(id, visibility); }
