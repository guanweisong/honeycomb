---
name: lightweight-ddd
description: Apply the project's lightweight DDD and modular-monolith architecture when adding or refactoring feature business logic.
---

# 轻量 DDD 工程规范

本 Skill 只适用于当前 Honeycomb 工程的业务模块开发、重构和架构审查。

## 目标结构

复杂业务模块保持领域结构，简单 CRUD 模块保持最小结构：

```text
feature/
├── domain/                 # 仅复杂业务模块
├── service.ts              # 简单 CRUD；复杂模块使用 *.service.ts
├── repository.ts
├── infrastructure/
├── transport/
├── admin/
└── public/
```

## 必须遵守

- 业务不变量、状态流转和领域错误放在 `domain`。
- 简单 CRUD 的用例统一放在模块根部 `service.ts`；复杂模块可按职责拆分 command/query，但不新建 `application` 目录。
- 仓储协议统一放在模块根部 `repository.ts`，实现放在同一模块的 `infrastructure`。
- Drizzle、数据库连接、schema、存储 SDK 和第三方客户端只能出现在 `infrastructure` 或明确的技术包中。
- `transport`、`admin`、`public` 只负责输入适配、权限、依赖注入和展示，不承载业务规则。
- 跨模块只能依赖目标模块的 `public` 或共享公开契约，不得依赖目标模块的 `domain`、`infrastructure`、`admin` 或用例文件。
- 不新增 facade、空的 `interfaces` 层、业务模块 `contracts` 层或重复兼容出口。
- 简单 CRUD 不强行创建聚合、值对象或领域事件；只有存在真实业务不变量时才引入。

## 工作流程

1. 先定位目标模块的 domain（如有）、service、repository 和 transport 入口。
2. 将业务规则放入 domain，将用例编排放入 service，将数据库映射放入 infrastructure。
3. 通过依赖注入传递 repository，不在用例中创建数据库连接或直接查询 schema。
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
