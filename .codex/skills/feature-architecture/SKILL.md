---
name: feature-architecture
description: 当在 Honeycomb 中新增、精简或审查业务逻辑、数据库操作、纯规则和 feature 依赖边界时使用。
---

# 简单 Feature 架构

## 业务归属

app 负责框架组合；features 负责业务 router/schema/types/rules/server/admin/public；components 负责通用 UI/编辑器；lib 负责数据库、认证、缓存、存储、tRPC、可观测性和国际化等技术能力。

普通路径为 UI → router → server 函数 → db。server.ts 或 server/ 都允许，直接使用 Drizzle，不要求 Repository 接口、factory 或 Use Case。纯状态规则按需独立，schema 与类型由业务所有者提供，不建立集中 contracts 或人工 application/domain/infrastructure 目录。

## 必须遵守

- Router 保留输入、会话、capability、限流及错误协议；server 函数保留业务授权条件、状态转换、事务、条件写入和外部副作用顺序。
- 可缓存渲染只读取；业务写入不藏在 query 名称或展示 helper 中。
- lib/db 和 lib/auth 可依赖 feature 的纯 catalog/schema/type，但不能加载业务运行时。lib/trpc 不组合业务 router，根组合与 caller 留在 app/_trpc。
- feature 不依赖 app。跨 feature 可直接引用稳定纯契约、有意复用的具名 UI 或 server 操作，不要求 public 转发；禁止 router 耦合与运行时越界。通用组件以注入接入业务能力。
- 保留 browser/server/Edge 隔离、server-only 标记和公开 DTO 实际字段裁剪。纯规则与 schema 不导入数据库或框架。
- 删除仅转发参数的 wrapper 和重复模型；保留有独立校验、事务、映射、并发或外部适配责任的函数。简单 CRUD 不制造聚合、事件总线或替换接口。

## 工作流程

1. 阅读实际调用链及现有测试，先记录不可变行为。定义类型或 schema 时，**REQUIRED SUB-SKILL:** Use type-safety-governance，先检查唯一事实源。
2. 在所属 feature 直接实现 server 操作，需要时抽取纯规则或具名持久化 helper；以真实函数签名构造 typed fixture/mock，不为测试另造一层生产接口。
3. 保护发布与账号规则、分类 SQL 防环、并发条件写入、事务/翻译语义、GUEST 数据范围与安全 DTO。
4. 明确数据库成功与后续副作用边界，保留 publicSync 降级、通知容错、媒体删除不确定结果及幂等恢复。
5. 更新消费者和边界测试，删除旧出口；同步 OpenSpec 与文档。
6. 运行 check-types、lint、相关测试与 diff 检查。跨模块变更运行全量单元、进程、覆盖率、build 及可运行 E2E；不降低质量门槛，逐项报告未验证边界。

只选责任所需的最少目录和最直接调用。测试数据库仍严格遵守 test-database-safety，不接触生产数据。

## 认证框架组合例外

现有 `lib/trpc/context.ts` 为读取会话而延迟导入 `src/auth.ts` 是窄技术集成例外；`src/auth.ts` 绑定 Better Auth，认证 hook 与登录审计的框架组合位于 `app/_auth`。该例外不允许 lib/auth 运行时导入 feature 操作，也不允许 lib/trpc 组合业务 router。
