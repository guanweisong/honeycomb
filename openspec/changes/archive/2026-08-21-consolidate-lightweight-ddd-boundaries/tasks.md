## 1. 业务入口收敛

- [x] 将业务 schema 迁移到各 feature 的 `schemas/` 目录。
- [x] 更新 feature、页面和组件的 schema import。
- [x] 删除 `src/packages/trpc/api/modules` 下的业务 schema 和 router 测试。

## 2. 测试与边界

- [x] 将 router 测试迁移到对应 feature 的 `tests/` 目录。
- [x] 将 Comment model 迁移到 feature-owned types 目录。
- [x] 更新权限矩阵和 server-only 扫描器。
- [x] 增加旧业务目录和跨层 schema import 的边界测试。

## 3. 结构与文档

- [x] 删除空的 feature `transport/` 目录。
- [x] 更新 feature、测试和架构文档。
- [x] 删除 `docs/superpowers/` 设计与计划产物。

## 4. 验证

- [x] 运行类型检查。
- [x] 运行 Lint。
- [x] 运行全量单元测试。
- [x] 运行 `git diff --check`。
