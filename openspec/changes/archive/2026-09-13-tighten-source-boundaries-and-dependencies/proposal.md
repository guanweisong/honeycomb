## Why

近期静态审计发现测试专用的权限矩阵和类型仍位于生产源码目录，另有仅测试使用的 i18n 转发模块、无运行时消费者的 bcryptjs 依赖，以及多份只为转发 Application schema 而存在的文件。这些残留扩大生产模块与依赖表面，并让实际契约所有权不够直接。

## What Changes

- 将权限 UI 检查矩阵及其专用类型迁入测试目录，保留现有授权行为覆盖。
- 删除仅供测试引用的 i18n schema 转发模块，并让行为测试直接验证权威 schema。
- 迁移所有 schema 转发文件的内部消费者到权威定义，删除确认无外部稳定性承诺的纯再导出文件。
- 移除 bcryptjs 的无效测试 mock 与生产依赖，修正 README 中 bcryptjs 和 Drizzle-Zod 的过时描述。
- 增加架构回归门禁，阻止测试辅助契约和已删除的转发出口回到生产源码。
- 保留语义不同的菜单读取模型、后台导航模型和博客导航模型，不合并仅名称相同的类型。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `architecture-complexity-governance`：测试专用源码不得留在生产模块目录；已确认无独立职责的 schema 转发文件必须清理并由门禁防止回归。
- `dependency-supply-chain-hygiene`：只供测试使用的包不得保留为生产依赖；无效依赖 mock 与过时依赖说明必须清理。

## Impact

影响 `src/features/*/schemas` 的内部导入、权限 UI 测试矩阵、tRPC 本地化 schema 测试、`package.json`、`bun.lock`、README 和架构回归测试。不改变业务运行时行为、tRPC 协议、Zod 输入语义、数据库结构、路由或权限判定。
