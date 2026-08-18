# 架构依赖报告

## 目标分层

```text
src/app       路由入口、布局、中间件和页面组装
    ↓
src/features  按业务垂直拆分的功能模块及其公开/管理/应用/传输层
    ↓
src/packages  技术能力和共享基础设施
```

跨业务复用必须通过 `features/*/public` 或 `features/contracts` 完成。其他业务
不得直接依赖某个 feature 的 `admin`、`application` 或 `transport` 内部实现。

## 业务功能

当前业务功能包括：

`category`、`comment`、`link`、`media`、`menu`、`page`、`post`、`setting`、
`tag` 和 `user`。

每个业务功能统一提供以下入口：

- `application`：业务用例、查询和命令
- `transport`：tRPC 路由和传输适配
- `admin`：管理端界面
- `public`：公开页面和跨业务公开能力

`features/media/shared` 存放媒体 UI 共享能力，供媒体管理页面和文章编辑器
复用，避免文章功能直接依赖媒体管理端内部实现。

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

这些检查用于阻止 feature 反向依赖 App Router、跨 feature 访问内部实现，以及
技术包依赖路由层或传输细节。

## 运行环境注意事项

端到端测试需要 `.env` 中配置可访问的数据库地址。如果地址格式错误或数据库
不可访问，可能出现 `TypeError: fetch failed` 或 `bad port`。这属于测试环境问题，
应修复测试配置或环境变量，不应通过放宽架构边界来规避。
