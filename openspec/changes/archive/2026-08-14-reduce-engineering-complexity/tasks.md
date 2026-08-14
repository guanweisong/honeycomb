# 任务

## 1. tRPC 业务下沉

- [x] 1.1 将文章 Router 的写操作、缓存、标签事务和查询委托给 `post.service.ts`。
- [x] 1.2 将分类 Router 的写操作委托给 `category.service.ts`。
- [x] 1.3 将页面、媒体、用户、评论、链接、菜单、标签、设置、统计和账号安全 Router 的直接业务逻辑委托给业务 Service。
- [x] 1.3a 将页面、链接、菜单、标签和设置 Router 的直接业务逻辑委托给业务 Service。
- [x] 1.3b 将媒体、用户和统计 Router 的直接业务逻辑委托给业务 Service。
- [x] 1.4 为本轮新增 Service 公共导出补充中文 JSDoc，并保持错误码语义。

## 2. 大文件拆分

- [x] 2.1 将权限矩阵测试共享输入抽离到独立 fixtures 文件。
- [x] 2.2 将权限矩阵共享夹具从大型行为测试中拆分。
- [x] 2.2a 将权限矩阵测试边界工具抽到独立测试工具文件。
- [x] 2.3 将数据库 relations 从 `schema.ts` 拆分到 `relations.ts`，并保持稳定导出。

## 3. 依赖与抽象清理

- [x] 3.1 审计 package.json、源码、配置和动态导入引用，确认仅 `zustand` 为直接未使用依赖。
- [x] 3.2 删除直接未使用的 `zustand` 依赖并同步根 lockfile 声明。

## 4. 验证

- [x] 4.1 运行相关测试、类型检查和 Lint。
- [x] 4.2 运行单线程全量单元测试、Webpack 生产构建和 `git diff --check`。
