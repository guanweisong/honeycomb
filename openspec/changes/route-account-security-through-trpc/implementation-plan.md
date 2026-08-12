# 账号安全查询迁移到 tRPC 实施计划

> **执行要求：** 按测试驱动方式逐项实施；生产代码前必须先观察对应测试因缺少行为而失败。

**目标：** 将登录历史从独立 Next.js Route Handler 迁移到 `accountSecurity.loginHistory` tRPC query，同时保持 Better Auth 协议调用和页面行为不变。

**架构：** 新增独立 `accountSecurityRouter`，通过 `Permission.userReadSelf` 获取经过验证的 `ctx.user`，调用既有登录历史 repository，并在传输边界将 `createdAt` 转换为 ISO 字符串。客户端改用项目 tRPC React Query hook；Better Auth 的 Passkey、密码、会话和 OAuth 关联继续直接调用 `authClient`。

**技术栈：** Next.js App Router、tRPC、React Query、Better Auth、Vitest、React DOM Test Utils。

## 全局约束

- 不修改数据库结构与登录历史记录机制。
- 不包装 Better Auth 协议接口。
- 不改变账号安全页面布局、文案和最多 50 条倒序规则。
- 新增行为必须经过 RED → GREEN 测试周期。

---

### 任务 1：账号安全 tRPC Router

**文件：**

- 新建：`src/packages/trpc/api/modules/account-security/account-security.router.ts`
- 新建测试：`src/packages/trpc/api/modules/account-security/account-security.router.test.ts`
- 修改：`src/packages/trpc/api/appRouter.ts`
- 修改：`src/packages/auth/server/login-history.repository.ts`
- 修改测试：`src/packages/auth/server/login-history.repository.test.ts`
- 删除：`src/packages/auth/login-history-query.ts`
- 删除：`src/packages/auth/login-history-query.test.ts`

**接口：**

- 输入：无。
- 输出：`Array<{ id; event; provider; ipAddress; userAgent; createdAt: string }>`。
- 依赖：`listUserLoginHistory(ctx.db, ctx.user.id)` 返回安全列与数据库 `Date`。

- [x] 编写 Router 测试，使用固定 repository 记录断言 query 仅传入当前用户 ID、返回固定 ISO 时间，并拒绝未登录用户。
- [x] 运行 `bunx vitest run src/packages/trpc/api/modules/account-security/account-security.router.test.ts`，确认因 Router 尚不存在而失败。
- [x] 调整 repository 仅选择并返回安全数据库列，将固定 50 条限制保留在 repository。
- [x] 实现 `accountSecurityRouter`，使用 `permissionProcedure(Permission.userReadSelf)` 并映射 `createdAt.toISOString()`。
- [x] 在 `appRouter` 注册 `accountSecurity`。
- [x] 删除 `auth/login-history-query` 转换模块及其测试。
- [x] 重新运行 Router 测试并确认通过。

### 任务 2：登录历史组件切换 tRPC

**文件：**

- 新建测试：`src/app/admin/(root)/(dashboard)/account/security/LoginHistorySettings.test.ts`
- 修改：`src/app/admin/(root)/(dashboard)/account/security/LoginHistorySettings.tsx`

**接口：**

- 消费：`trpc.accountSecurity.loginHistory.useQuery()`。
- 展示：加载 Skeleton、失败 toast、空状态和现有历史字段。

- [x] 编写组件测试，通过完整 query 状态 fixture 验证加载、列表、空状态和错误提示，并确认不再触发原生 `fetch`。
- [x] 运行该组件测试，确认因组件仍使用 `fetch` 而失败。
- [x] 用 tRPC hook 替换 `useEffect + fetch + useState`，仅保留错误 toast effect。
- [x] 重新运行组件测试并确认通过。

### 任务 3：移除旧入口并强化边界

**文件：**

- 删除：`src/app/api/account/security/login-history/route.ts`
- 删除：`src/app/api/account/security/login-history/route.test.ts`

**接口：**

- 保留：`src/app/api/auth/[...all]/route.ts` 的 Better Auth handler。
- 移除：`GET /api/account/security/login-history`。

- [x] 删除旧 route 与测试，搜索 `/api/account/security/login-history` 确认无生产引用。
- [x] 运行账号安全、tRPC 与 capability matrix 相关测试。

### 任务 4：完整验证

**文件：**

- 修改：`openspec/changes/route-account-security-through-trpc/tasks.md`

- [x] 运行 `bun run check-types`。
- [x] 运行 `bun run lint`。
- [x] 运行全量 Vitest。
- [x] 使用构建专用环境变量运行生产构建。
- [x] 运行 `git diff --check`。
- [x] 运行 `openspec validate route-account-security-through-trpc --type change --strict --no-interactive`。
- [x] 将 OpenSpec tasks 全部标记完成并确认 apply 进度为全完成。

### 任务 5：通用登录历史能力迁入账号安全领域包

**文件：**

- 新建：`src/packages/account-security/login-history.ts`
- 新建测试：`src/packages/account-security/login-history.test.ts`
- 新建：`src/packages/account-security/server/login-history.repository.ts`
- 新建测试：`src/packages/account-security/server/login-history.repository.test.ts`
- 新建：`src/packages/auth/authentication-events.ts`
- 新建测试：`src/packages/auth/authentication-events.test.ts`
- 修改：`src/packages/auth/server/auth-hooks.ts`
- 修改：`src/packages/auth/server/auth-request-audit.ts`
- 修改：`src/packages/trpc/api/modules/account-security/account-security.router.ts`
- 修改：`src/packages/package-boundaries.test.ts`
- 删除：`src/packages/auth/login-history.ts`
- 删除：`src/packages/auth/login-history.test.ts`
- 删除：`src/packages/auth/login-history-events.ts`
- 删除：`src/packages/auth/login-history-events.test.ts`
- 删除：`src/packages/auth/server/login-history.repository.ts`
- 删除：`src/packages/auth/server/login-history.repository.test.ts`

- [x] 先创建新路径测试并运行，确认因新模块缺失而失败。
- [x] 将登录历史模型与 repository 迁入 `packages/account-security`，保持记录构建、90 天保留、最多 50 条倒序查询行为。
- [x] 将 Better Auth 路径识别重命名为 `authentication-events` 并保持映射行为。
- [x] 更新 Auth hooks、请求审计与 tRPC Router 的导入路径。
- [x] 扩展边界测试，要求账号安全领域包存在生产模块且不依赖 Auth、tRPC 或 App。
- [x] 删除 Auth 下旧文件并确认无遗留导入。
- [x] 运行新路径测试、Auth 审计测试、Router 测试和包边界测试。

### 任务 6：领域边界迁移后的完整验证

- [x] 运行 `bun run check-types`。
- [x] 运行 `bun run lint`。
- [x] 运行全量 Vitest。
- [x] 使用构建专用环境变量运行生产构建。
- [x] 运行 `git diff --check` 和 OpenSpec 严格校验。
- [x] 确认 OpenSpec apply 进度再次达到全完成。
