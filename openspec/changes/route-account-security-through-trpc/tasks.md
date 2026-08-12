## 1. tRPC 账号安全查询

- [x] 1.1 先补充失败测试，约束 `accountSecurity.loginHistory` 使用当前用户 ID、返回 ISO 时间字符串且保持安全字段。
- [x] 1.2 让登录历史 repository 仅返回数据库安全列，将公开 DTO 转换移入并注册 `accountSecurityRouter`，复用 `userReadSelf` 权限 procedure。

## 2. 客户端迁移

- [x] 2.1 先补充失败测试，约束登录历史组件使用 tRPC 查询并保持加载、错误、空状态和列表展示。
- [x] 2.2 将登录历史组件从原生 `fetch` 切换为 tRPC React Query hook。
- [x] 2.3 删除旧登录历史 Route Handler 及其专用测试，并确认没有遗留调用。

## 3. 边界与回归验证

- [x] 3.1 删除 Auth 中仅服务于 HTTP DTO 的登录历史转换模块，并通过 Router、组件和 capability matrix 测试确认新边界。
- [x] 3.2 运行相关测试、全量测试、类型检查、Lint、生产构建、差异检查与 OpenSpec 严格校验。

## 4. 账号安全领域边界

- [x] 4.1 先补充失败测试，约束登录历史模型与 repository 从 `packages/account-security` 提供，并保持既有记录、保留和查询行为。
- [x] 4.2 将通用登录历史模型、repository 与测试迁入 `packages/account-security`，更新 Auth 和 tRPC 消费路径。
- [x] 4.3 将 Better Auth 路径识别模块重命名为认证事件分类器，并删除 Auth 下遗留的通用登录历史文件。
- [x] 4.4 扩展包边界测试，约束 `packages/account-security` 不依赖 Auth、tRPC 或 App。

## 5. 最终验证

- [x] 5.1 运行相关测试、全量测试、类型检查、Lint、生产构建、差异检查与 OpenSpec 严格校验。
