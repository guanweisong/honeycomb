import "server-only";
import type { PostListInput, PostQueryRepository, PostVisibility } from "../infrastructure/post-query-repository";
export type { PostListInput } from "../infrastructure/post-query-repository";
/** 查询文章列表。 */
export function getPostList(repository: PostQueryRepository, input: PostListInput, visibility: PostVisibility = "PUBLISHED_ONLY") { return repository.list(input, visibility); }
