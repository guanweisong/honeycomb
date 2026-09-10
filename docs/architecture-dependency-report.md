# 架构依赖报告

## 目标分层

```text
src/app       路由入口、布局、中间件和页面组装
    ↓
src/features  按业务垂直拆分的功能模块、schema、用例、router 和公开/管理入口
    ↓
src/packages  技术能力和共享基础设施
```

## 复杂度治理目标

新的业务代码遵循以下稳定路径：

```text
Client UI → tRPC Query → Server Query/Router → Repository

业务操作：
Client/Server UI → Transport Adapter → Application Use Case
                                      ├─ Domain（可选）
                                      └─ Repository 接口 → Infrastructure
```

- `domain` MUST 不依赖框架、数据库和传输层。
- `application` MUST 承载业务用例编排，不在 procedure 或页面中复制业务规则。
- `infrastructure` MUST 隐藏数据库、存储、缓存和外部服务实现。
- `transport` MUST 只组装副作用 adapter；缓存、通知和对象存储的执行顺序及失败语义由 Application Use Case 决定。
- 展示层 MUST 使用 View Model，不直接接收 Drizzle schema 类型。
- 权限 MUST 通过 capability registry 和统一授权服务判断。

复杂度治理基线由 `tests/architecture-complexity.test.ts` 执行，后续迁移不得新增超过 600 行的生产文件、反向依赖或展示层数据库模型泄漏。

跨业务复用必须通过 `features/*/public` 或 `features/contracts` 完成。其他业务
不得直接依赖某个 feature 的 `admin`、用例或根部 router 内部实现。

## 业务功能

当前业务功能包括：

`category`、`comment`、`link`、`media`、`menu`、`page`、`post`、`setting`、
`tag` 和 `user`。

业务功能按需提供以下边界；简单查询和 CRUD 不强制创建空目录：

- `application/*-use-cases.ts`：业务操作编排；简单查询可由 Query/Repository 直接提供
- `application/repository.ts`：Repository 接口和稳定读写契约
- feature 根部 `*.router.ts`：tRPC 路由和传输适配
- `admin`：管理端界面；只有多文件管理功能才保留目录
- `public`：公开页面和跨业务公开能力；没有消费者时不创建目录

Application 用例只编排业务用例和领域规则，不得导入 Drizzle、数据库连接、schema
或 ORM 查询构造器。需要持久化时，必须依赖 feature 自己的窄端口；Drizzle adapter
统一放在同一 feature 的 `infrastructure` 目录，并由 router 或 app 入口注入。
缓存和外部服务同样通过窄端口注入；跨 Feature 的公开缓存端口由
`src/packages/application/public-content-invalidator.ts` 统一定义，Next.js adapter 留在
Infrastructure。该约束由 `tests/feature-boundaries.test.ts`、
`tests/architecture-complexity.test.ts` 和 `tests/public-cache-invalidation-boundaries.test.ts`
持续检查。

`features/media/shared` 存放媒体 UI 共享能力，供媒体管理页面和文章编辑器
复用，避免文章功能直接依赖媒体管理端内部实现。

## 单服务轻量 DDD 结构

核心业务模块采用以下轻量边界；外围 CRUD 模块不强制复制全部目录：

```text
feature transport / presentation
                    ↓
             application use case
                    ├─ domain（可选）
                    └─ application repository → infrastructure
```

`domain` 只包含业务状态、不变量和聚合行为；Application Use Case 负责
用例编排与事务边界；`infrastructure` 负责 Drizzle、存储、通知等外部适配；
Repository 接口由 Application 定义。简单模块不强制 Domain，复杂模块仅在存在
稳定、可复用且需要独立测试的不变量时引入 Domain。

各 feature 按真实业务不变量选择是否使用聚合；简单 CRUD 保持 Query/Use Case
和 Repository 的最小结构，避免过度复杂化。工程不保留没有生产消费者的进程内事件总线、
pending event 队列或幂等事件处理器；现有缓存、通知和对象存储副作用由 Application
Use Case 编排，Infrastructure adapter 执行，transport 只负责注入。

## DDD 迁移记录

- 已为全部十个业务模块建立 `infrastructure`、Application 和按需的公开、管理边界；
  Repository 契约统一迁入各 feature 的 `application/repository.ts`，旧根部契约已删除。
- 已将核心命令接入 Post、Page、Comment、User 聚合，聚合只负责状态转换和不变量。
- 已增加领域边界、聚合状态机和 fake repository 测试，并删除仅由测试使用的事件抽象。
- 保留现有 tRPC、Admin Action 和公开页面入口，未改变外部输入输出契约。
- 当前不保留无独立职责的业务 facade；新的业务操作必须进入 Application Use Case，
  稳定业务不变量才进入 Domain。

## 验证记录

最近一次验证结果（2026-09-11）：类型检查、Lint、迁移治理、生产依赖审计和 Webpack
生产构建均通过；270 个单元测试文件中的 1209 项测试和 52 项进程级测试均通过。
覆盖率为语句 83.12%、分支 75.24%、函数 80.83%、行 84.35%，没有降低全局或关键文件门槛。
安全响应头、RBAC 与 PWA 关键 Chromium E2E 为 6/6 通过；生产 PWA 离线导航还以
同一用例连续两次通过验证时序稳定性。

默认 Turbopack 构建在当前受限执行环境中因 PostCSS 子进程无法绑定内部端口而失败；
相同隔离假配置下 Webpack 构建成功，且失败发生在任何数据库访问前。
该环境限制不记录为分析成功，后续应在允许子进程本地通信的 CI/开发环境复跑。

## 技术包

- `domain`：与框架无关的领域基础类型和规则
- `identity`：身份认证、授权和权限规则
- `infrastructure`：数据库、存储、缓存、HTTP 和外部服务
- `trpc`：tRPC 客户端/服务端集成和传输 schema
- `ui`：可复用 UI、导航适配器和展示层工具

技术包不得依赖 `app` 或 `features`。

## 自动化约束

以下测试负责持续检查架构边界：

- `tests/feature-boundaries.test.ts`
- `tests/server-only-boundaries.test.ts`
- `src/packages/package-boundaries.test.ts`
- `src/packages/trpc/api/capability-procedure-matrix.test.ts`
- `tests/capability-entrypoint-boundaries.test.ts`
- `src/packages/identity/auth/capability-registry.test.ts`

这些检查用于阻止 feature 反向依赖 App Router、跨 feature 访问内部实现，以及
技术包依赖路由层或传输细节。

权限入口统一通过 `src/packages/identity/auth/capability-registry.ts` 登记。tRPC
procedure、Admin Action、Admin route 和菜单只引用已登记 capability；registry 负责
检查完整性、重复声明和入口消费者覆盖，权限矩阵仍负责表达具体角色结果。

## 运行环境注意事项

端到端测试需要 `.env` 中配置可访问的数据库地址。如果地址格式错误或数据库
不可访问，可能出现 `TypeError: fetch failed` 或 `bad port`。这属于测试环境问题，
应修复测试配置或环境变量，不应通过放宽架构边界来规避。
