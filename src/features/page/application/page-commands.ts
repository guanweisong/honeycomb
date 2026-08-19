import "server-only";
import type { PageCommandInput, PageCommandRepository } from "../infrastructure/page-command-repository";
export type { PageCommandInput } from "../infrastructure/page-command-repository";
/** 创建独立页面。 */
export function createPage(repository: PageCommandRepository, input: PageCommandInput, authorId: string) { return repository.create(input, authorId); }
/** 批量删除独立页面。 */
export function destroyPages(repository: PageCommandRepository, ids: string[]) { return repository.destroy(ids); }
/** 更新独立页面。 */
export function updatePage(repository: PageCommandRepository, input: PageCommandInput & { id: string }) { return repository.update(input); }
/** 增加公开页面浏览量。 */
export function incrementPageViews(repository: PageCommandRepository, id: string) { return repository.incrementViews(id); }
