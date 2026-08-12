## Why

依赖审计发现富文本清洗、数据库、国际化和 CSS 处理的直接依赖存在已知漏洞；组件生成 CLI 也被错误地随生产依赖安装，扩大了部署供应链。

## What Changes

- 升级 `sanitize-html`、`drizzle-orm`、`next-intl` 与 `postcss` 到已修复版本。
- 将仅用于生成组件的 `shadcn` 转为开发依赖。
- 更新 Bun 锁文件并复跑漏洞审计与回归检查。

## Capabilities

### New Capabilities

- `dependency-supply-chain-hygiene`: 约束直接运行时依赖的漏洞修复与开发工具隔离。

### Modified Capabilities

- 无。

## Impact

- 影响 `package.json`、`bun.lock` 和安装依赖树；不改变应用 API 或数据结构。
