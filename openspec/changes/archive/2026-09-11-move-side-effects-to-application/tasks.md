## 1. 建立失败边界

- [x] 1.1 修改公开缓存静态治理测试，要求 Router 不得直接导入或调用缓存失效实现，并确认当前代码失败
- [x] 1.2 为共享缓存端口和代表性写入 Use Case 增加失败行为测试，覆盖成功顺序、Repository 失败短路和缓存失败传播
- [x] 1.3 为评论创建和媒体删除补充边界测试，确认外部服务编排必须保留在 Application 且入口限流仍位于 transport

## 2. 建立缓存 Application 端口

- [x] 2.1 审计现有缓存目标类型、所有失效调用点和消费者，确定唯一事实源
- [x] 2.2 在 `src/packages/application` 定义最小 `PublicContentInvalidator` 契约，并为 Next.js `revalidatePath` 实现提供 Infrastructure adapter
- [x] 2.3 为端口和适配器补充聚焦测试，禁止任意路径从客户端或 Use Case 进入适配器

## 3. 迁移内容 Feature

- [x] 3.1 将 Post 创建、更新、删除和标签变更的缓存失效迁入 Application，按目标维持现有范围和顺序
- [x] 3.2 将 Page 创建、更新和删除的缓存失效迁入 Application，按目标维持现有范围和顺序
- [x] 3.3 将 Comment 创建、审核和删除的缓存失效迁入 Application，并保持验证码、通知和失败日志语义
- [x] 3.4 更新 Post、Page、Comment Router 为依赖组装入口，删除直接缓存调用并通过聚焦测试

## 4. 迁移公开目录 Feature

- [x] 4.1 将 Category、Tag 和 Menu 写操作的全量公开缓存失效迁入各自 Application Use Case
- [x] 4.2 将 Setting 和 User 影响公开内容的写操作失效迁入各自 Application Use Case
- [x] 4.3 更新对应 Router、Use Case 测试和测试 fake，确认失败写入不会触发失效

## 5. 收紧架构治理

- [x] 5.1 更新 Feature 与副作用边界测试，阻止 Router 直接执行缓存、邮件或对象存储业务副作用
- [x] 5.2 复扫验证码、通知、对象存储和缓存消费者，确认 Application 不依赖 Infrastructure 且没有重复端口或旧入口
- [x] 5.3 同步前端架构、轻量 DDD、README 和 OpenSpec 文档中的副作用职责说明

## 6. 完整验证

- [x] 6.1 运行相关 Use Case、Router、缓存、通知、媒体和架构边界测试
- [x] 6.2 运行 `bun run check-types`、`bun run lint`、`bun run test:unit:run`、`bun run test:unit:coverage` 和 `bun run test:unit:process`
- [x] 6.3 运行迁移治理、生产依赖审计、生产构建和 `git diff --check`，记录环境限制与最终结果
- [x] 6.4 更新本变更验证记录，确认所有任务、规格与实际实现一致

## 7. 补齐友情链接公开缓存

- [x] 7.1 为 Link 创建、更新、删除增加 Application 缓存顺序、写入失败短路和缓存失败传播测试，并确认当前实现失败
- [x] 7.2 将 Link 写操作的全量公开缓存失效迁入 Application Use Case，Router 仅注入 `publicContentInvalidator`
- [x] 7.3 将 Link Router 纳入公开缓存静态边界并更新所有调用方测试 fake
- [x] 7.4 运行聚焦测试、类型检查、Lint、完整单测和 OpenSpec 严格校验，更新验证记录

## 8. 收敛多层公开缓存一致性

- [x] 8.1 为统一失效计划、详情去重、文章索引版本和 sitemap tag 增加失败测试
- [x] 8.2 实现单次结构化缓存失效适配器，并迁移 Post、Page、Comment、Category、Link、Tag、Menu、Setting 和 User Use Case
- [x] 8.3 为 Media 删除补充公开布局与文章索引失效，并将批量文章/页面删除合并为一次失效调用
- [x] 8.4 从 Post Repository 移除隐藏缓存副作用，将 `CleanZod` 迁出 tRPC 并增加 Application 依赖门禁
- [x] 8.5 为 sitemap 缓存增加共享 tag，完成全量验证并更新架构与验证文档

## 9. 修复复审发现的一致性窗口

- [x] 9.1 增加失败测试，覆盖分类 sitemap、内层缓存优先顺序、媒体空目标重试和空失效计划拒绝
- [x] 9.2 修正 Category 失效范围、统一适配器执行顺序与 Media 删除重试语义
- [x] 9.3 收紧计划 Schema、Router 直接调用门禁和各写操作计划测试矩阵
- [x] 9.4 运行聚焦测试、完整质量门禁与 OpenSpec 严格校验，并更新验证记录

## 10. 修复缓存初始化与公开身份边界

- [x] 10.1 增加失败测试，覆盖首次缓存版本提升、通用用户更新端点和公开文章作者字段最小化
- [x] 10.2 修复 Upstash 版本键缺失时首次失效仍命中隐式默认版本的问题
- [x] 10.3 禁用绕过 Application 的 Better Auth 用户更新端点，并收窄公开文章作者读取模型
- [x] 10.4 运行聚焦测试、完整质量门禁与 OpenSpec 严格校验，并更新架构和验证记录

## 11. 关闭评论传递依赖与空操作边界

- [x] 11.1 增加失败测试，覆盖 Comment Application 的 HTTP 类型泄漏、传递 Infrastructure 依赖、目标业务规则顺序和空批量删除
- [x] 11.2 将评论请求元数据、目标状态判断与公共 DTO 映射迁入 Application，并让 Repository 只负责状态读取和持久化
- [x] 11.3 删除 Comment 根目录兼容转出口，改为 Router 直接注入通知 adapter，并增强 Application 传递依赖门禁
- [x] 11.4 增加真实 Better Auth handler 拒绝 `/update-user` 的行为测试，运行完整质量门禁并更新验证记录
