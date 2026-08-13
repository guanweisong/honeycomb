## 为什么

当前工程同时使用 tRPC、Better Auth、直接 `fetch` 和 Server Component caller。整体职责基本合理，但 Server Component 的 tRPC caller 没有当前请求上下文，容易让需要鉴权的服务端查询被误判为匿名；站点设置和认证读取也存在重复实现。现在需要统一请求边界，降低后续 RSC 改造和接口维护风险。

## 变更内容

- 让服务端 tRPC caller 支持传入当前请求 headers，并保留公开数据的服务端调用能力。
- 建立服务端认证和站点设置 DAL，统一 Server Component 的读取入口。
- 审查并迁移 admin、blog、sitemap 中的服务端调用，避免使用无请求上下文调用鉴权 procedure。
- 明确 tRPC、Better Auth、R2 直传和普通 Route Handler 的职责边界。
- 删除确认不再使用的冗余 provider Route Handler。
- 补充请求上下文、认证传播、DAL 和边界回归测试。

## 能力

### 新增能力

- `server-request-context`: Server Component 和服务端 caller 能够继承当前请求认证上下文。
- `server-data-access`: 认证用户和站点设置通过稳定的服务端 DAL 读取。

### 修改能力

无。

## 影响范围

- `src/packages/trpc/api` 的服务端 caller 和 context。
- `src/app/admin`、`src/app/(blog)`、sitemap 等 Server Component 数据读取。
- Better Auth、tRPC Route Handler、R2 上传和 provider Route Handler 的边界测试。
- 不改变公开 API 的 procedure 名称和客户端 tRPC 协议。
