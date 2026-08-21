import type { CategoryRepository } from "../application/repository";

/** 分类展示模型，隔离 tRPC 输出契约。 */
export type CategoryViewModel = Awaited<
  ReturnType<CategoryRepository["list"]>
>["list"][number];
