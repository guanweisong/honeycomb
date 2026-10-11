## Why

工程已有清晰的 Feature/Application/Infrastructure 分层，但部分只读用例仅转发 Repository 调用，增加了没有独立职责的路径。现有架构测试也没有直接验证所有 Feature 写入口都经过 Application；这次顺手收敛内容 Schema 文件，并更新已过期的工程说明。

## What Changes

- 删除纯转发的只读 Application 包装，保留有权限策略、业务校验、映射、缓存或副作用的查询。
- 扩展架构门禁，覆盖所有 Feature 的 tRPC 写入口与 Application 用例边界。
- 将集中在单个文件中的内容表定义按稳定业务关系拆分，并保持现有导出和数据库 schema 不变。
- 修正文档中与实际实现不符的说明，更新覆盖率基线，并消除 Vitest 配置模块格式警告。
- 让迁移门禁根据回放后的实际数据库结构识别 schema 变化，允许不改变结构的源文件整理。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `application-use-case-boundary`：明确简单只读查询不得保留纯转发包装，并让写入口约束覆盖所有 Feature。
- `architecture-complexity-governance`：架构测试需遍历现有 Feature，避免新增模块未纳入边界检查。

## Impact

影响 `src/features/*/application`、Feature Router、数据库 schema 模块、架构测试、Vitest 配置和测试文档。公开 API、tRPC 输入输出、持久化表结构、迁移和运行时业务行为保持不变。
