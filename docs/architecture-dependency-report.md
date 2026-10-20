# 架构与依赖边界

本文描述当前的简单 feature 架构，不是执行结果或覆盖率报告。具体阅读入口见[代码阅读地图](code-reading-map.md)，迁移方法见[迁移说明](ddd-migration-guide.md)。历史审计的计数和检查结果不能当作本轮验证证据。

## 四种职责

- `src/app`：路由、布局、HTTP 适配与框架组合，包括根 tRPC router、服务端 caller 和公开内容的 Next.js 缓存入口。
- `src/features/<feature>`：业务 router、输入 schema、业务类型、纯规则、服务端读写和所属业务 UI。
- `src/components`：通用 UI 和编辑器。通过 props、回调或注入接收业务能力，不反向依赖 app 或 feature 运行时。
- `src/lib`：数据库、认证、tRPC 核心、缓存、存储、可观测性、国际化等技术能力。业务状态、类型、展示选项不因有多个消费者就迁到 lib。

不再使用 `src/packages`，也不要求 feature 建立 `application/domain/infrastructure` 目录。目录按职责需要建立，而不是按模板补齐。

## 最短业务路径

```text
Client UI → feature router → feature server 函数 → db / 技术适配器
Server Component → feature server 读取函数
业务 server 函数 → 纯规则（需要时）
```

feature 的 `server.ts` 或 `server/` 可以直接使用 Drizzle 和 `lib/db`。函数接收实际所需的数据库、身份、输入或外部能力，明确事务边界与错误语义；不要求先创建 Repository 接口、factory、Use Case 或 handler。只有具有独立校验、授权、事务、转换、缓存或外部系统适配职责的函数才值得保留。

Router 处理输入校验、会话、入口 capability、限流和协议错误映射，业务写入与副作用顺序由 feature server 函数承担。可缓存 Server Component 不在渲染阶段执行写操作。页面和 router 不复制发布、审核、账号保护等规则。

## 依赖与运行时边界

- 根 router 在 `src/app/_trpc/router.ts`，服务端 caller 在 `src/app/_trpc/server.ts`。`lib/trpc` 只承载公共 core/context/client 及传输工具，不运行时导入业务 router 或 app。客户端为推导类型而 `import type` 根 `AppRouter` 是允许的例外。
- 跨 feature 可直接引用对方拥有的纯 schema/type/catalog，以及有意复用的具名 UI 或 server 操作入口；不要求 public barrel 或集中 features/contracts。不能耦合另一 feature 的 router、反向导入 app，或让纯模块/浏览器加载服务端运行时。
- app 是组合层，可接入 feature 的 router、server、admin 和 public 入口。feature 不反向导入 app。
- `lib/db`、`lib/auth` 可以引用 feature 拥有的纯状态目录、schema 或类型；这些依赖不能传递加载业务 server 操作、UI、通知或根 router。这不是允许任意 lib 反向依赖 feature 的通行证。
- 纯 schema、类型与规则不依赖 React、Next.js、tRPC server、数据库或外部 SDK。展示代码消费稳定结果模型，不接收数据库连接、ORM 查询对象或完整敏感记录；相同语义的 DTO 不为层次对称重复定义。
- 浏览器代码不加载数据库、服务端认证、环境 secret、存储 SDK 或 Node-only 可观测性实现；Edge 路径不加载 Node-only SDK。边界检查须追踪间接 import、re-export、动态 import 与 require。

## 不能因精简而丢失的行为

- 入口权限仍通过 `src/lib/auth/capability-registry.ts` 登记并由服务端执行。GUEST 列表访问不等于未发布内容或评论隐私访问；前端 `useCan` 不是授权边界。
- 文章和页面的发布条件、错误码、事务、翻译更新语义和并发写入保护保持不变。分类父节点更新必须保留 SQL 循环保护，不能只留下更新前检查。
- 公共文章作者仅返回 `id`、`name`。评论公开 DTO 必须实际选择允许字段；类型别名不会删除邮箱、IP 或 User-Agent。评论请求头先在入口转为普通元数据。
- 评论验证码、公开目标、评论开关和父子同源校验必须在写入前完成。评论提交成功后通知失败只记录脱敏日志，不把成功写入变成失败。
- 数据库提交是内容写入成功边界。`lib/cache/public-content-invalidator.ts` 保留结构化失效计划、有限重试和 `publicSync` 降级反馈。失效顺序仍为文章索引版本、sitemap、公开路由；范围去重、首次版本递增、关联快照刷新、sitemap TTL 和媒体幂等重试不得遗漏。
- 媒体先删除对象，再删除数据库记录；对象失败保留记录，后续数据库失败返回不确定结果，不能伪报完全未执行。业务媒体选择属于 media feature，通用编辑器通过注入使用。
- 草稿恢复、重复保存保护、Sentry 脱敏、浏览器/服务端/Edge 隔离和 public DSN 回退保持原语义。

## 验证要求

架构、权限、类型安全、持久化、缓存、浏览器和覆盖率测试必须随新路径更新，不得删除实质断言或降低阈值。相关入口包括 `tests/feature-boundaries.test.ts`、`tests/server-only-boundaries.test.ts`、`tests/architecture-complexity.test.ts`、`tests/readability-boundaries.test.ts`、`tests/capability-entrypoint-boundaries.test.ts` 和 `tests/public-cache-invalidation-boundaries.test.ts`。

完整重构需要类型、Lint、全量单元与进程测试、覆盖率、生产构建及可运行的开发/生产 E2E。数据库测试仅使用显式隔离、可清理的本地 `file:` 数据库；不得以环境问题为由放宽安全边界。结果应逐项记录通过、失败或未运行，不沿用历史测试数和覆盖率。

## 认证框架组合例外

现有 `lib/trpc/context.ts` 为读取会话而延迟导入 `src/auth.ts` 是窄技术集成例外；`src/auth.ts` 绑定 Better Auth，认证 hook 与登录审计的框架组合位于 `app/_auth`。该例外不允许 lib/auth 运行时导入 feature 操作，也不允许 lib/trpc 组合业务 router。
