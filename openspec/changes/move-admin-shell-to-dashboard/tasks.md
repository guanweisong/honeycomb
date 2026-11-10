## 1. 迁移 Dashboard Shell

- [x] 1.1 将 AdminLayout、AdminNavigation 两个组件子树及其现有测试迁入 `src/app/admin/(dashboard)/components`，保持内部结构、导出、实现和 `use client` 指令。
- [x] 1.2 将 `menu-data.tsx` 及测试迁入 `src/app/admin/(dashboard)/config`，更新所有生产导入、测试导入和 mock，删除旧 `src/app/admin/components` 与 `src/app/admin/constants/menu-data.tsx` 路径。

## 2. 更新归属约定

- [x] 2.1 更新 `package-layer-architecture` 的本次增量、架构规则索引、目录模板和代码阅读地图，说明 dashboard shell 与菜单数据归属。
- [x] 2.2 在旧 `refine-owned-module-locations` 设计与增量规范处标记 header context 根路径决策已被本变更取代，保留历史实施记录。

## 3. 静态复核

- [x] 3.1 搜索旧生产路径和导入，确认消费者、测试 mock、导出、资源与 client 指令都已迁移，确认 URL、认证和 Provider 组合没有变化。
- [x] 3.2 运行 OpenSpec 变更校验、类型检查、Lint 与 `git diff --check`；不运行测试。
