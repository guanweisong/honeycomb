## 为什么

当前多个 tRPC Router 在调用写入用例后直接执行公开缓存失效，导致一个完整业务操作被拆散在传输层与 Application 层。新增 Server Action、后台任务或其他入口时可能只复用数据库写入而遗漏缓存或外部服务副作用，因此需要把业务结果所必需的副作用顺序收敛到 feature-owned Application Use Case。

## 变更内容

- 为公开内容缓存失效建立不依赖 Next.js 的最小 Application 端口，由 Infrastructure 统一协调路由、文章索引和 sitemap 缓存。
- 将分类、评论、友情链接、菜单、页面、文章、设置、标签和用户写操作的缓存失效编排迁入各 Feature 的 Application Use Case。
- 审计邮件通知、对象存储和验证码等外部服务，确保业务顺序与失败语义由 Application 表达，Router 只负责注入依赖。
- 保留 API 限流、会话解析、入口鉴权和 tRPC 错误映射等传输职责，不把它们误迁入 Application。
- 将缓存失效治理测试从“Router 必须调用失效器”改为“写入 Use Case 必须编排副作用，Router 不得直接执行副作用”。
- 使用一次结构化失效计划表达详情、公开布局、文章索引和 sitemap 影响范围，消除批量写入的重复刷新，并补齐分类、标签、用户和媒体对文章关联快照缓存的影响。
- 修复缓存版本键首次创建时与隐式默认版本碰撞的问题，确保第一次写入失效即可切断旧文章索引缓存。
- 禁用 Better Auth 通用用户资料写入口，公开文章作者只输出页面实际需要的 `id` 与 `name`；后台用户管理继续经过 capability 保护的 Application Use Case。
- 将评论目标可见性、评论开关和父子同源规则从数据库适配器迁入 Comment Application；传输层先把 HTTP headers 转换为纯请求元数据，Application 不再通过根目录转出口间接依赖 Infrastructure DTO 或通知实现。
- 拒绝空批量删除请求，并以真实 Better Auth handler 行为验证通用资料写入口确实返回 404。
- 保持既有页面消费契约、tRPC 输入、权限、缓存范围、邮件失败语义和媒体删除重试行为不变；删除此前未声明且不应公开的账户字段。

## 能力

### 新增能力

无。

### 修改能力

- `application-use-case-boundary`：明确所有与业务写入结果相关的缓存、通知、对象存储和验证码副作用由 Application Use Case 编排，并禁止传输层直接执行。
- `public-content-freshness`：公开缓存失效必须由对应写入 Use Case 保证，而不是依赖某一种传输入口补充调用。
- `side-effect-consistency`：统一评论通知、媒体存储和缓存副作用的 Application 端口与失败语义，同时保留入口限流等传输层职责。
- `api-security-boundaries`：公开内容 DTO 采用最小披露，并关闭绕过 Application 与 capability 鉴权的身份写入口。

## 影响

- 影响 `src/features/*/*.router.ts`、各 Feature 的 `application` 契约与写入用例、Comment 查询/持久化适配器，以及 `src/packages/infrastructure/refresh-path.ts` 的适配方式。
- 更新 Router、Use Case、副作用顺序和架构边界测试；同步 OpenSpec 主规范相关增量要求。
- 不新增第三方依赖，不修改数据库 schema、迁移或权限矩阵；公开文章响应不再携带未使用的账户内部字段。
