import "server-only";
import type { PostCommandInput } from "../post-transforms";
import type { PostCommandRepository } from "./repository";
import { updatePost as updatePostThroughAggregate } from "./post-command-handlers";
import type { InProcessEventBus } from "@/packages/domain/events/event-bus";
export type { PostCommandInput } from "../post-transforms";
/** 创建文章。 */
export function createPost(repository: Pick<PostCommandRepository, "create">, input: PostCommandInput, authorId: string) { return repository.create(input, authorId); }
/** 批量删除文章。 */
export function destroyPosts(repository: Pick<PostCommandRepository, "destroy">, ids: string[]) { return repository.destroy(ids); }
/** 更新文章。 */
export function updatePost(repository: Pick<PostCommandRepository, "findStatus" | "update">, input: PostCommandInput & { id: string }, bus?: InProcessEventBus) { return updatePostThroughAggregate(repository, input, bus); }
/** 替换文章标签关联。 */
export function updatePostTags(repository: Pick<PostCommandRepository, "updateTags">, input: { postId: string; tagIds: string[]; type: import("@/packages/domain/content/tag").TagType }) { return repository.updateTags(input); }
/** 增加公开文章浏览量。 */
export function incrementPostViews(repository: Pick<PostCommandRepository, "incrementViews">, id: string) { return repository.incrementViews(id); }
