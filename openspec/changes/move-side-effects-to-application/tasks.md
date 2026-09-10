## 1. 建立失败边界

- [ ] 1.1 修改公开缓存静态治理测试，要求 Router 不得直接导入或调用缓存失效实现，并确认当前代码失败
- [ ] 1.2 为共享缓存端口和代表性写入 Use Case 增加失败行为测试，覆盖成功顺序、Repository 失败短路和缓存失败传播
- [ ] 1.3 为评论创建和媒体删除补充边界测试，确认外部服务编排必须保留在 Application 且入口限流仍位于 transport

## 2. 建立缓存 Application 端口

- [ ] 2.1 审计现有缓存目标类型、所有失效调用点和消费者，确定唯一事实源
- [ ] 2.2 在 `src/packages/application` 定义最小 `PublicContentInvalidator` 契约，并为 Next.js `revalidatePath` 实现提供 Infrastructure adapter
- [ ] 2.3 为端口和适配器补充聚焦测试，禁止任意路径从客户端或 Use Case 进入适配器

## 3. 迁移内容 Feature

- [ ] 3.1 将 Post 创建、更新、删除和标签变更的缓存失效迁入 Application，按目标维持现有范围和顺序
- [ ] 3.2 将 Page 创建、更新和删除的缓存失效迁入 Application，按目标维持现有范围和顺序
- [ ] 3.3 将 Comment 创建、审核和删除的缓存失效迁入 Application，并保持验证码、通知和失败日志语义
- [ ] 3.4 更新 Post、Page、Comment Router 为依赖组装入口，删除直接缓存调用并通过聚焦测试

## 4. 迁移公开目录 Feature

- [ ] 4.1 将 Category、Tag 和 Menu 写操作的全量公开缓存失效迁入各自 Application Use Case
- [ ] 4.2 将 Setting 和 User 影响公开内容的写操作失效迁入各自 Application Use Case
- [ ] 4.3 更新对应 Router、Use Case 测试和测试 fake，确认失败写入不会触发失效

## 5. 收紧架构治理

- [ ] 5.1 更新 Feature 与副作用边界测试，阻止 Router 直接执行缓存、邮件或对象存储业务副作用
- [ ] 5.2 复扫验证码、通知、对象存储和缓存消费者，确认 Application 不依赖 Infrastructure 且没有重复端口或旧入口
- [ ] 5.3 同步前端架构、轻量 DDD、README 和 OpenSpec 文档中的副作用职责说明

## 6. 完整验证

- [ ] 6.1 运行相关 Use Case、Router、缓存、通知、媒体和架构边界测试
- [ ] 6.2 运行 `bun run check-types`、`bun run lint`、`bun run test:unit:run`、`bun run test:unit:coverage` 和 `bun run test:unit:process`
- [ ] 6.3 运行迁移治理、生产依赖审计、生产构建和 `git diff --check`，记录环境限制与最终结果
- [ ] 6.4 更新本变更验证记录，确认所有任务、规格与实际实现一致
