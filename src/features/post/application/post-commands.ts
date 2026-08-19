import "server-only";
import type { PostCommandInput } from "./post-transforms";
import type { PostCommandRepository } from "../infrastructure/post-command-repository";
export type { PostCommandInput } from "./post-transforms";
/** 创建文章。 */
export function createPost(repository: PostCommandRepository, input: PostCommandInput, authorId: string) { return repository.create(input, authorId); }
/** 批量删除文章。 */
export function destroyPosts(repository: PostCommandRepository, ids: string[]) { return repository.destroy(ids); }
/** 更新文章。 */
export function updatePost(repository: PostCommandRepository, input: PostCommandInput & { id: string }) { return repository.update(input); }
/** 替换文章标签关联。 */
export function updatePostTags(repository: PostCommandRepository, input: { postId: string; tagIds: string[]; type: import("@/packages/domain/content/tag").TagType }) { return repository.updateTags(input); }
/** 增加公开文章浏览量。 */
export function incrementPostViews(repository: PostCommandRepository, id: string) { return repository.incrementViews(id); }
