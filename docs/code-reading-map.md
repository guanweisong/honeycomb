# 代码阅读地图

先找业务入口，再顺着实际调用走。当前架构为 `app / features / components / lib`；不需要逐层经过 Use Case、Repository 或聚合。

## 常用路径

### 修改文章

1. 编辑交互：`src/features/post/admin/edit/hooks/use-post-editor.tsx`。
2. API 输入、权限和协议适配：`src/features/post/router.ts`。
3. 写入、事务与缓存失效：`src/features/post/server/` 内的实际操作函数；发布不变量在 `src/features/post/rules.ts`。
4. 数据库连接与表：`src/lib/db`；输入与输出模型由 post feature 自己拥有。

server 函数直接访问数据库，不额外创建只转发参数的工厂或用例。成功写入后的缓存降级通过 `publicSync` 表达，不能误报成写入失败。

### 版本化编辑与创建恢复

文章、页面的 `create` 输入必须包含 `creationToken`；`update` 必须包含 `expectedVersion`，`destroy` 使用 `{ items: [{ id, expectedVersion }] }`，不再接受只有 ID 的删除批次。具体字段以各 feature 的 `schema.ts` 为准，不把表单类型当作持久化输入。

`post.creationResult` / `page.creationResult` 在当前账户与创建权限下按 token 查询，返回 `{ id, version }` 或 `null`，不是完整编辑快照或永久幂等回执。确认已有资源后重新读取详情；资源删除后查询不到不能证明请求从未成功，也不能据此自动重放未知结果。

菜单后台读取 `menu.adminIndex` 的 `{ version, list, total }` 快照，`menu.saveAll` 提交 `{ expectedVersion, items }`；公开 `menu.index` 仍是公开菜单列表。设置从 `setting.index` 读取版本，`setting.update` 提交完整后台快照及 `expectedVersion`。实现入口为各 feature 的 `router.ts`、`schema.ts` 和 `server.ts`；上线顺序见[迁移手册](database-migration-runbook.md)。

### 媒体上传与人工恢复

`src/features/media/router.ts` 提供 `beginUpload` → 浏览器临时 PUT → `confirmUpload`，结果按 `ready` / `pending` / `rejected` 分支处理。`status` 与 `reconcile` 用于原上传行核对，不是另一次上传；旧 `getPresignedUrl` / `upload` tRPC 入口已移除（存储适配器内部仍有签名方法）。当前管理列表默认 READY，可按状态查看有权访问的恢复记录。

最终字节校验在 `server/image-validation.ts`，事务授权及引用保护在 `server/media-repository.ts` / `server/media-references.ts`。生命周期、删除确认和运行时限制只在[媒体运行手册](media-storage-runbook.md)集中说明。

### 读取公开内容

1. 页面组合：`src/app/(blog)/[locale]` 对应路由。
2. 框架缓存和请求内去重：`src/app/lib/server/public-queries.ts`。
3. 根服务端 caller：`src/app/_trpc/server.ts`；业务路由在各 feature 的 `router.ts`，读取实现由其 `server.ts` 或 `server/` 提供。
4. UI 使用 feature 拥有的模型与有意复用的具体入口（可在 public/admin/components）；不要求 public barrel 或中央 contracts 转发。

文章元信息和标签展示位于 `src/features/post/public/PostInfo` 与 `src/features/post/public/Tags`；文章和页面浏览量上报各自由对应 feature 的 public 组件负责。媒体富文本在 `src/features/media/public/RichText`，通用图片使用 `next/image`，灯箱在 `src/components/PhotoSwipe`，不把业务 mutation 放回 app 组件。

文章查询与缓存解码共用 `src/features/post/post-read-model.ts` 的运行时 schema；读取版本不能用默认值补造，旧缓存校验失败回源。媒体公共读取模型与管理恢复模型分别在 `src/features/media/types.ts`，不把临时 key、尝试信息等恢复字段透传给公开消费者。

评论公开 DTO 必须真正挑选允许字段，不能用类型别名代替脱敏。评论组件接收数据，不反向导入 app 查询实现。GUEST 后台读取同样受服务端数据范围限制。

### 后台当前用户与权限

1. 服务端会话和启用状态复核：`src/features/user/admin-user.ts`。
2. 页面提供初始用户：`src/app/admin/AdminProviders.tsx`。
3. 客户端当前用户与刷新：`src/features/user/admin/use-current-user.ts`。
4. 权限规则：`src/lib/auth/permissions.ts` 与 `authorize.ts`；服务端 API 仍是最终授权边界。

认证框架绑定在 `src/auth.ts`，登录 hook 与请求审计组合在 `src/app/_auth`。`lib/trpc/context.ts` 仅为会话读取延迟加载认证绑定。

`useCan` 只控制界面呈现。认证技术实现可引用 feature 纯角色目录，但不能反向加载用户业务写入。

### 后台统计与路由

1. 统计页面组合：`src/app/admin/(dashboard)/dashboard/page.tsx`；业务 UI 在 `src/features/dashboard/admin/components/DashboardPageClient/index.tsx`。
2. 统计入口与读取：`src/features/dashboard/router.ts` → `server.ts`；结果类型从实现经 tRPC 推断，不保留仅供测试引用的平行模型。
3. `src/app/_trpc/router.ts` 仍挂载 `statistic`，保留 `Permission.statisticsRead` 对应的 `statistics:read` 权限。站点设置及翻译仍归 setting，不把统计放回该 feature。

`src/app/admin/(dashboard)/layout.tsx` 与 `template.tsx` 是认证和页面边界；login、forbidden 直接位于 admin 下，不再套无职责的 `(root)`。post/page 根路由只是客户端导航，直接在 app 保留 `useLayoutEffect` / `router.replace`，不需要 feature 壳或改成服务端 redirect。

### 具名纯工具与直接入口

- 分类树：`src/features/category/tree.ts`；Drizzle 查询构造：`src/lib/db/query/query-builders.ts`。
- UTC 展示格式：`src/lib/ui/utc-format.ts`；HTML 图片提取：`src/lib/content/image-links.ts`。
- 文章分页 hook：`src/features/post/public/use-post-list.ts`；菜单标题：`src/components/Menu/MenuTitle.tsx`。

这些路径按语义归属，不是全工程统一压平模板；职责明确的子目录仍可保留。

## 改动放哪里

| 要改什么                           | 先去哪里                                  |
| ---------------------------------- | ----------------------------------------- |
| 输入校验与稳定业务类型             | 所属 feature 的 `schema.ts` / `types.ts`  |
| 查询、事务、写入和副作用顺序       | 所属 feature 的 `server.ts` / `server/`   |
| 可独立测试的状态不变量             | 所属 feature 的 `rules.ts` 或具名纯规则   |
| 业务枚举、显示选项、专用组件       | 所属 feature 的纯目录、`admin` / `public` |
| 通用 UI 与编辑器                   | `src/components`                          |
| 数据库、认证、缓存、存储、可观测性 | `src/lib` 对应技术目录                    |
| 路由、HTTP、根 tRPC 和框架组合     | `src/app`                                 |

## 如何防止边界退化

不要重新引入 `src/packages`、中央 contracts、人工分层或无职责 wrapper。架构测试应阻止 feature 反向依赖 app、lib 运行时加载业务操作及浏览器/Edge 越界；同时继续覆盖权限、公开输出、持久化校验、缓存失败语义和类型唯一事实源。文档描述职责，最终验证结论以本轮实际命令输出为准。
