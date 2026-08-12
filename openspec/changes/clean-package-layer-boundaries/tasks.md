## 1. 共享契约与输出类型

- [x] 1.1 为共享 UI 添加不依赖 tRPC 的当前用户展示契约及失败边界测试。
- [x] 1.2 将 procedure 推导类型从 feature 内 `*.entity.ts` 迁移到 `trpc/api/outputs.ts` 并更新所有消费者。
- [x] 1.3 让共享 UI 与 tRPC context 使用领域契约，而不是 tRPC feature 的兼容类型导出。

## 2. 通知能力

- [x] 2.1 先添加评论邮件通知能力的回归测试，覆盖管理员通知和回复通知。
- [x] 2.2 将 Resend 发送器和评论邮件模板迁移到 `packages/notifications`，并更新评论 service。
- [x] 2.3 扩展边界测试，禁止通知能力依赖 tRPC 或 App Router。

## 3. 目录卫生

- [x] 3.1 将 blog/admin 的 `libs` 统一为 `lib`，将 post category 的 `constans` 修正为 `constants`。
- [x] 3.2 删除迁移后为空的账户安全 HTTP 路由目录。

## 4. 验证

- [x] 4.1 运行相关单元测试与包边界测试。
- [x] 4.2 运行类型检查、Lint 和生产构建验证。
