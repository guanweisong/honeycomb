---
name: frontend-structure
description: 当在 Honeycomb Next.js 工程中修改或审查路由、页面、组件、交互、样式、依赖或 feature 架构时使用。
---

# 前端工程结构规范

目标：用最短可读路径完成需求，保留真实安全与运行时边界，不为目录对称引入样板。

## 核心规则

1. `app` 放路由、布局、HTTP 与框架组合；`features` 放所属业务；`components` 放通用 UI/编辑器；`lib` 放共享技术能力。
2. 默认路径为 `UI → feature router → feature server 函数 → db`。Server Component 可直接调用服务端读取函数，不强制绕 tRPC。
3. feature 按需提供 `router.ts`、`schema.ts`、`types.ts`、`rules.ts`、`server.ts` 或 `server/`、`admin/`、`public/`。不要创建人工 `application/domain/infrastructure` 层或中央 contracts。
4. server 函数直接使用 Drizzle，负责业务校验、授权相关不变量、事务、并发保护和副作用顺序；不强制 Repository 接口、factory、Use Case 或 handler 跳转。
5. Router 处理输入、会话、capability、限流和协议错误。页面与 router 不复制业务状态转换；可缓存渲染不得执行写操作。
6. 纯 schema、类型、状态目录和 rules 不依赖 UI、数据库、服务端认证或框架实现；server 实现可以依赖数据库。客户端和 Edge 的真实运行时限制不变。
7. 根 tRPC 组合与服务端 caller 位于 `app/_trpc`；`lib/trpc` 只承载公共核心、上下文、客户端及传输工具。根 `AppRouter` 的 type-only 引用允许，运行时反向依赖不允许。
8. 跨 feature 可通过具体具名入口复用所属业务的纯契约、UI 或 server 操作，不强制 public barrel；禁止 router 耦合、反向 app 依赖及纯模块/浏览器的运行时泄漏。app 可组装业务入口。
9. `lib/db`、`lib/auth` 可引用 feature 拥有的纯 catalog/schema/type，但不得加载业务操作。通用组件通过 props/回调注入业务能力。
10. 模型、schema、权限、状态与规则只保留一个权威来源；不为分层复制同一字段清单。只有不同边界的真实转换才保留 mapper。
11. 架构调整先更新 OpenSpec；完成前运行类型、Lint、相关测试和 diff 检查，大范围改动保留全量覆盖率与构建/E2E 门禁。

## 必须保留的行为

入口 capability 与 GUEST 数据范围、公开 DTO 实际裁剪、发布条件、账号保护、分类 SQL 防环、事务和条件写入、缓存 `publicSync` 降级、评论通知容错、媒体删除不确定结果、草稿恢复、Sentry 隐私/public DSN 回退不得因重构改变。UI 权限控制不是服务端授权。

定义类型、schema、ViewModel、常量和转换时，**REQUIRED SUB-SKILL:** Use type-safety-governance，先执行唯一事实源检查。业务操作设计与精简时阅读 feature-architecture。

## 按需读取

- [架构边界](references/architecture.md)
- [目录与文件模板](references/directory-templates.md)
- [Next.js 约束](references/nextjs.md)
- [质量门禁](references/quality.md)
- [OpenSpec 流程](references/workflow.md)

先确认业务归属和实际调用链，搜索现有定义与行为测试，再修改真实职责所在的函数。同步全部消费者与文档后删除旧出口，不保留没有职责的兼容层。
