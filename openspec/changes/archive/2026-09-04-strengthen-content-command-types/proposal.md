## Why

Post 和 Page 的 Application 命令契约仍以 `unknown`、裸 `string` 和整体 ORM 断言承接已经过 Zod 校验的数据，类型检查无法真实表达跨层约束。需要建立准确 DTO，并让持久化映射逐字段、可验证且不依赖掩盖性断言。

## What Changes

- 为 Post 和 Page 定义准确的创建、更新 Application Command DTO。
- 多语言字段、状态、内容类型和评论状态使用明确业务类型，不再使用 `unknown` 或裸 `string`。
- 让 tRPC Zod 输入与 Application DTO 在编译期对齐。
- 将 Infrastructure mapper 改为显式逐字段映射，移除整体 Drizzle insert model 断言。
- 扩展类型治理门禁，防止业务命令重新引入开放式未知字段和 ORM 整体断言。
- 保持外部 tRPC 协议、数据库 schema 和持久化值不变。

## Capabilities

### New Capabilities

- `content-command-contracts`: 定义内容模块的真实 Application DTO、传输对齐和持久化映射要求。

### Modified Capabilities

无。

## Impact

- 影响 Post、Page 的 schema、Application Repository、Use Case、Infrastructure mapper、UI 调用和测试夹具。
- 影响项目级类型治理测试与文档。
- 不改变对外 API 或数据库结构。
