## 1. 回归门禁与测试基线

- [x] 1.1 在架构复杂度测试中登记 test-only 源码、i18n 包装、16 个纯 schema 转发文件和 bcryptjs 依赖的禁止路径
- [x] 1.2 运行专项测试确认旧结构会触发预期失败

## 2. 测试专用模块迁移

- [x] 2.1 将 9 份 Feature 权限 UI 矩阵及其类型迁入 `tests/fixtures/admin-action-guard-matrix/` 的扁平 fixture 文件和 helpers，保留现有聚合 helper
- [x] 2.2 删除 `src/packages/trpc/api/schemas/i18n.schema.ts`，并让本地化行为测试直接组合 Application 与 Domain 权威 schema
- [x] 2.3 更新 server-only 边界清单并运行权限、i18n 相关专项测试

## 3. Application schema 单一入口

- [x] 3.1 将生产及测试消费者从 16 个纯转发文件迁移到所属 Feature 的 `application/write-schema`
- [x] 3.2 删除 16 个纯转发文件，并把唯一事实源测试改为验证权威 schema 与不存在的转发出口
- [x] 3.3 运行受影响 Feature 测试和类型检查

## 4. 依赖和文档清理

- [x] 4.1 移除 capability 测试中未触发的 bcryptjs hash mock 及边界计数
- [x] 4.2 从生产依赖与锁文件删除 bcryptjs，修正文档中 bcryptjs 和 Drizzle-Zod 的过时条目

## 5. 完整验证

- [x] 5.1 运行 OpenSpec 严格校验、类型检查、Lint、全量单测、生产构建和 `git diff --check`
- [x] 5.2 复扫生产源码图、依赖和重命名契约，确认仅保留有真实消费者的模块

> 默认 Turbopack 构建受沙箱子进程/端口权限限制；按 Next.js 本地 CLI 文档使用 `bun next build --webpack` 后构建成功。
