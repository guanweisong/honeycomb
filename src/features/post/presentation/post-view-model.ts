import type {
  PostWithRelations,
  PostDetailResult,
} from "../application/repository";
/** 文章列表展示模型。 */
export type PostListViewModel = PostWithRelations;
/** 文章详情展示模型。 */
export type PostDetailViewModel = PostDetailResult;
