---
name: lightweight-ddd
description: Apply the project's lightweight DDD and modular-monolith architecture when adding or refactoring feature business logic.
---

# 轻量 DDD 工程规范

本 Skill 只适用于当前 Honeycomb 工程的业务模块开发、重构和架构审查。

## 目标结构

业务模块按需使用边界，简单查询不创建空层，业务操作使用 Application Use Case：

```text
feature/
├── queries/                # 读取适配，可直达 Query/Repository
├── application/            # 业务操作和 Repository 接口
├── domain/                 # 仅稳定、可复用的不变量
├── infrastructure/        # Repository 实现和外部适配
├── transport/              # tRPC/HTTP/Action 边界
└── presentation/           # View Model 和展示适配
```

目录按需创建；不为满足模板而创建空的 Use Case、Domain 或 wrapper。

## 必须遵守

- 业务不变量、状态流转和领域错误放在 `domain`；Domain 永远不访问 Repository。
- 任何改变持久化状态、触发外部副作用或需要多步骤协调的行为放在 `application` Use Case；简单查询可直达 Query/Repository。
- Repository 接口统一放在 `application`，实现放在同一模块的 `infrastructure`。
- Drizzle、数据库连接、schema、存储 SDK 和第三方客户端只能出现在 `infrastructure` 或明确的技术包中。
- `transport` 和 `presentation` 只负责输入适配、授权入口、依赖注入、结果映射和展示，不承载业务规则。
- 跨模块只能依赖目标模块的公开契约或稳定 Application 边界，不得依赖目标模块的 `domain`、`infrastructure` 或内部 transport 文件。
- 不新增 facade、空的接口层、业务模块 contracts 层或重复兼容出口。
- 简单 CRUD 不强行创建聚合、值对象或领域事件；只有存在稳定、可复用且需要独立测试的不变量时才引入。

## 工作流程

1. 先定位目标模块的 Query、Use Case（如有）、Repository 接口/实现和 transport 入口。
2. 将业务规则放入 domain，将业务操作编排放入 application，将数据库映射放入 infrastructure。
3. 通过依赖注入传递 Repository，不在 Use Case 中创建数据库连接或直接查询 schema。
4. 为新增不变量补充 domain 测试，为 repository 用例补充 fake repository 测试。
5. 修改后运行：
   - `bun run check-types`
   - `bun run lint`
   - `bun run test:unit:run`
   - `bun run build`（使用项目要求的构建环境变量）
   - `git diff --check`
6. 检查 `tests/feature-boundaries.test.ts` 和相关架构测试，确认没有重新引入旧目录或跨层依赖。

## 判断标准

优先选择最少目录、最少抽象和最直接的依赖关系。只有当规则需要保护不变量、隔离外部系统或复用稳定契约时，才增加领域对象、事件或接口。
