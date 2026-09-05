import { PostListResultSchema } from "../application/post-read-model";

/** 缓存只负责解码入口，不另建业务 DTO。 */
export function decodeCachedPostList(value: unknown) {
  return PostListResultSchema.parse(value);
}
