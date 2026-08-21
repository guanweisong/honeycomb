---
name: frontend-structure
description: 当在本 Next.js 前端工程中处理路由、页面、组件、交互、样式、依赖、包边界或前端架构时使用。
---

# 前端工程结构规范

目标：用最短可读路径完成需求，同时保持低复杂度、高可维护性、少样板、少重复定义，并用自动化验证质量。

## 先记住这 11 条

1. 查询路径：Client 用 `UI → tRPC Query → Server Query/Router → Repository`；Server Component 的简单查询可直接调用服务端 Query/Repository。客户端调用方式和服务端实现路径属于同一次查询，不额外增加业务层；Repository 不得把 ORM/数据库记录直接暴露给 UI。
2. 业务操作路径：`UI → Router → Use Case → Repository`。
3. Domain 是 Use Case 内部的可选能力，不是第三条强制路径；只有存在稳定、可复用的业务不变量时才引入。
4. 任何改变持久化状态、触发外部副作用或需要多个步骤协调的行为，都属于业务操作，必须经过 Use Case；Router 出现多步判断、多个数据源调用或状态顺序时必须提取。
5. Client UI 不访问数据库、Repository 或服务端实现；Server Component 可直接调用服务端 Query/Repository；Router 只做输入校验、传输适配和入口鉴权；Domain 不依赖 Next.js、tRPC、数据库等基础设施。
6. 同一业务概念和规则只保留一个权威来源；不同边界允许有转换模型，但转换必须显式，不复制规则。
7. `features/<feature>/application` 只承载单功能用例；跨功能编排放 `src/packages/application`，不要互相复制 service。只有跨两个及以上独立 Feature 且调用关系稳定时，才能进入 `src/packages/application`。
8. Feature 不得依赖其他 Feature 的内部文件；跨功能只能通过公开契约或 Application 边界调用。
9. 共享代码必须有真实的跨模块复用；包装层必须有独立职责，否则就地实现。
10. 新功能、行为变化或架构调整先走 OpenSpec；小型 bug、文案、局部样式和机械修改可直接处理。
11. 完成前至少运行类型检查、Lint、相关测试，并检查 diff；架构边界违规必须阻断 CI。详细门禁见 [quality.md](references/quality.md)。

## 选择主路径

| 场景 | 默认结构 |
| --- | --- |
| Client 查询、列表、详情、搜索 | UI → tRPC Query → Server Query/Router → Repository |
| 创建、更新、删除或其他业务操作 | UI → Router → Use Case → Repository |

当业务操作包含稳定、可复用的不变量时，Use Case 内部可以调用 Domain：

```text
UI → Router → Use Case
                  ├─ Domain
                  └─ Repository
```

Domain 不依赖 Repository；Use Case 负责协调 Domain 和 Repository。Server Component 的简单查询可以直接调用服务端 Query/Repository，但必须返回稳定的读取模型或经过 Query 映射的结果；业务操作必须调用 Use Case，不得直接调用写入 Repository。Client UI 通过 tRPC/HTTP Router，不为了形式统一而额外绕 tRPC。Router 是传输边界，不是所有读取都必须增加业务层。

Query 只负责读取适配、查询组合和结果映射，不承载写入、跨步骤业务流程或外部副作用。

## 单一事实源

- 同一业务概念和规则只保留一个权威来源；数据库记录、领域实体、API 输出和表单输入可以是不同边界的模型，但转换必须显式。
- 权限必须在服务端业务入口校验：Router 负责外部请求的身份/能力入口校验，Use Case 负责不可绕过的业务授权；内部可信调用不重复校验。Domain 只判断业务不变量，不感知登录实现。
- 不保留“旧 service + 新 use case”“旧 model + 新 model”两套并行入口；迁移完成后删除重复层。

## 最小目录约定

按功能组织：`src/features/<feature>/{components,queries,mutations,application,domain,infrastructure}`；公共 UI 放 `src/components`，跨功能应用编排放 `src/packages/application`，基础设施放对应 package。简单读取不强行创建 Use Case/Domain 目录。

上述目录只是按需模板，不要求一次创建全部目录。

完整文件模板、命名和迁移规则见 [directory-templates.md](references/directory-templates.md)。

## 按需读取

- 架构边界、例外和反模式：阅读 [architecture.md](references/architecture.md)。
- 目录、文件模板和命名：阅读 [directory-templates.md](references/directory-templates.md)。
- Next.js 路由、Server/Client、UI、样式和依赖：阅读 [nextjs.md](references/nextjs.md)。
- 测试、文件规模、验证和评审：阅读 [quality.md](references/quality.md)。
- OpenSpec 变更流程：阅读 [workflow.md](references/workflow.md)。

## 执行顺序

1. 明确功能边界和调用路径。
2. 搜索现有定义、组件、Repository 和测试，优先复用。
3. 只新增当前路径所需的层和文件。
4. 同步测试与文档，清理重复入口和无用代码。
5. 按质量门禁验证，并在交付中说明路径选择和验证结果。

架构边界应优先通过静态检查、import boundary 测试和 CI 门禁执行；文档只补充工具无法表达的判断规则。
