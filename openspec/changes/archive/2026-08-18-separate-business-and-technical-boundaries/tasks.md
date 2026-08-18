## 1. 建立业务聚合基础

- [x] 1.1 新增 `src/features` 目录约定和 feature 边界测试。
- [x] 1.2 增加 Comment、Post、Media 的 feature 入口和共享类型策略。

## 2. 迁移 Comment

- [x] 2.1 迁移 Comment application 用例、DTO、目标校验和通知编排。
- [x] 2.2 迁移 Comment tRPC schema/router，并保留旧路径兼容出口。
- [x] 2.3 迁移 Admin Comment queries、actions、columns、components 和页面组合。
- [x] 2.4 迁移 Blog Comment components、hooks 和 utils。
- [x] 2.5 运行 Comment 相关测试并修复导入和边界问题。

## 3. 迁移 Post

- [x] 3.1 迁移 Post application 查询、命令、转换和关系逻辑。
- [x] 3.2 迁移 Post tRPC schema/router，并保留旧路径兼容出口。
- [x] 3.3 迁移 Admin Post 列表、编辑器和分类相关功能。
- [x] 3.4 迁移 Blog Post 查询和页面依赖。
- [x] 3.5 运行 Post 相关测试并修复导入和边界问题。

## 4. 迁移 Media

- [x] 4.1 迁移 Media application 查询和命令。
- [x] 4.2 迁移 Media tRPC schema/router，并保留旧路径兼容出口。
- [x] 4.3 迁移 Admin Media 页面、queries、actions 和媒体选择器依赖。
- [x] 4.4 运行 Media 相关测试并修复导入和边界问题。

## 5. 全量验证和收尾

- [x] 5.1 检查三项 feature 不存在跨 feature 内部依赖和重复实现。
- [x] 5.2 执行类型检查、Lint、全量单元测试和生产构建。
- [x] 5.3 审计 README、测试说明、架构规范和 OpenSpec 任务是否需要同步。

## 6. 完成其余业务域迁移

- [x] 6.1 迁移 Link、Menu、Page、Setting、Tag、User 和 Category 的 Admin 代码。
- [x] 6.2 迁移上述业务域的 Application 用例和 tRPC Router。
- [x] 6.3 移除无调用方的旧业务入口，保留 Next.js 路由薄入口和 tRPC schema 技术目录。
- [x] 6.4 将跨业务 View Model contracts 迁移到 `src/features/contracts`。
- [x] 6.5 执行全量单测、覆盖率、类型检查、Lint 和生产构建。
- [x] 6.6 执行 Playwright 回归并记录数据库环境阻塞。
