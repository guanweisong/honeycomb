## 目标结构

业务功能采用 feature-first 组织，技术基础层继续采用现有 packages 分层：

```text
src/features/<功能>/
├── application/   # 业务用例、规则、DTO 和副作用编排
├── transport/     # tRPC schema、router 和传输适配
├── admin/         # Admin 页面、组件、queries、actions、columns
└── public/        # Blog 公共组件、hooks 和页面专属交互
```

`domain`、`identity`、`infrastructure`、`ui` 不迁入 feature；它们继续作为稳定共享技术边界。

## 迁移范围

按以下顺序迁移：

1. Comment：同时覆盖 Blog 公共评论、Admin 评论、Application 用例、tRPC Router 和评论通知。
2. Post：覆盖 Blog 查询、Admin 列表与编辑器、Application 用例和 tRPC Router。
3. Media：覆盖 Admin 媒体页面、媒体选择器、Application 用例和 tRPC Router。
4. Link、Menu、Page、Setting、Tag、User 和 Category：覆盖 Admin 页面、Application 用例和 tRPC Router。

每一批迁移都先移动实现，再建立旧路径兼容出口，最后修改生产调用方。测试文件与实现保持相邻或跟随其所在业务子目录。

## 依赖方向

```text
features/<功能>/admin  ─┐
features/<功能>/public ─┼→ features/<功能>/transport
                        └→ features/<功能>/application
features/<功能>/transport → features/<功能>/application
features/<功能>/application → domain / identity / infrastructure
features/<功能>/admin/public → packages/ui
```

Feature 不得依赖其他 feature 的内部文件。跨功能复用必须通过稳定的 `domain`、`packages/ui` 或明确的 application contract 完成。

## 兼容策略

- tRPC Router 对外导出路径保持不变，App Router 调用方式保持不变。
- 旧的 `src/packages/application/...` 文件在无生产引用后删除，不保留重复业务实现。
- 不改变数据库 Schema、权限策略、缓存键、通知规则和错误码。

## 验证策略

- 新增 feature 边界测试，检查 feature 不跨功能导入内部实现。
- 每批迁移执行相关测试、全量单元测试、类型检查和 Lint。
- Post、Media 迁移完成后执行生产构建。
- 检查旧导出路径、tRPC procedure 名称和客户端 Bundle 边界。
