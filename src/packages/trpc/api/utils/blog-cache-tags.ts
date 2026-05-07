export const blogCacheTags = {
  setting: () => "blog:setting",
  menu: () => "blog:menu",
  links: () => "blog:links",
  postList: () => "blog:post:list",
  post: (id: string) => `blog:post:${id}`,
  postCategory: (categoryId: string) => `blog:post:category:${categoryId}`,
  page: (id: string) => `blog:page:${id}`,
  tag: (id: string) => `blog:tag:${id}`,
  user: (id: string) => `blog:user:${id}`,
} as const;
