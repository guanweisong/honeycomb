## 1. 建立类型回退门禁

- [x] 1.1 新增失败测试，禁止 Post/Page Application Command DTO 使用 `unknown` 或开放式记录字段
- [x] 1.2 新增失败测试，禁止内容 mapper 使用整体 Drizzle insert model 断言
- [x] 1.3 添加类型级契约，证明 Zod schema 输出无需断言即可传给 Application Command

## 2. 收紧 Post 命令

- [x] 2.1 定义 `PostCreateCommand`、`PostUpdateCommand` 和明确的多语言输入字段
- [x] 2.2 将状态、文章类型、评论状态和标签类型对齐既有领域枚举
- [x] 2.3 更新 Post Use Case、Repository 端口、Router 和测试 fixture
- [x] 2.4 重写 Post mapper 为显式逐字段映射和 `satisfies` 检查，保持清洗及持久化结果不变

## 3. 收紧 Page 命令

- [x] 3.1 定义 `PageCreateCommand`、`PageUpdateCommand` 和明确的多语言内容字段
- [x] 3.2 将页面状态与模板对齐既有领域类型
- [x] 3.3 更新 Page Use Case、Repository 端口、Router 和测试 fixture
- [x] 3.4 重写 Page mapper 为显式逐字段映射和 `satisfies` 检查，保持部分更新语义

## 4. 验证

- [x] 4.1 运行类型治理、Post、Page、Repository 和 tRPC 协议聚焦测试
- [x] 4.2 运行类型检查、Lint、完整单元测试、覆盖率、生产构建和 `git diff --check`
- [x] 4.3 复核公开 API、数据库 schema、迁移和用户可见行为均未改变
