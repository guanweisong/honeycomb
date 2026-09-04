## Why

当前生产数据库已经领先于本地未版本化的 Drizzle 迁移，而仓库又忽略整个 `drizzle/` 目录，导致 Git 无法重建或审计真实数据库结构。需要以生产结构为事实源建立一次受控基线，并从此让 schema 变更与迁移文件共同进入版本控制。

## What Changes

- 只读 introspect 当前生产数据库，并审查其与 TypeScript schema 的差异。
- 放弃本地未追踪的旧迁移产物，以生产结构生成新的 baseline。
- 让 Drizzle 迁移 SQL、元数据和 journal 进入版本控制。
- 明确现有生产库的基线登记方式，禁止向它重放初始化 baseline。
- 增加 schema/迁移同步门禁，并区分开发环境 `push` 与受控环境 `migrate`。
- 补充新环境初始化、现有生产库接管、部署和故障恢复文档。

## Capabilities

### New Capabilities

- `database-migration-governance`: 定义生产结构 introspection、基线建立、版本化迁移、部署执行和同步校验要求。

### Modified Capabilities

无。

## Impact

- 影响 `.gitignore`、`drizzle.config.ts`、`drizzle/`、数据库 schema、CI 和部署文档。
- introspection 阶段只读访问生产数据库；本变更不得自动修改生产 schema 或数据。
- 新 baseline 改变新环境的初始化来源，但不改变现有公开 API。
