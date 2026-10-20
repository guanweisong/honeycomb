/** 缓存与低基数指标标签共享的命名空间目录。 */
export const CacheNamespace = { postIndex: "post.index" } as const;
export const cacheNamespaceValues = Object.values(CacheNamespace);
export type CacheNamespace =
  (typeof CacheNamespace)[keyof typeof CacheNamespace];
