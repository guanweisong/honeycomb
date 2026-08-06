## Context

应用现有日志由多个模块直接调用 `console.error` 或 `console.warn`，缺少统一字段、请求关联和脱敏。API、数据库与 Upstash 缓存也没有稳定指标，无法回答失败集中在哪个 procedure、查询耗时是否上升或缓存命中率是否下降。部署横跨 Vercel 和 Cloudflare，核心抽象不能依赖单一供应商 SDK。

## Goals / Non-Goals

**Goals:**

- 建立稳定的日志、指标和错误捕获接口。
- 默认输出可被云平台采集的单行 JSON 日志。
- 记录 API、数据库、缓存与外部服务的低基数指标。
- 在不改变业务结果的前提下处理观测 adapter 故障。
- 允许未来用 adapter 接入 OpenTelemetry、Sentry 或平台服务。

**Non-Goals:**

- 不在本 change 选择或部署第三方观测后端。
- 不实现分布式追踪协议或持久化指标存储。
- 不记录请求体、原始 SQL 参数、认证凭据或个人信息。
- 不建立业务分析报表。

## Decisions

### 1. 核心接口与 adapter 分离

`observability/core` 定义 `Logger`、`Metrics`、固定事件名、固定指标名、脱敏和错误序列化；`observability/adapters` 提供 console logger、noop metrics 和 memory test adapter；`observability/server` 提供请求与服务端 instrumentation。业务模块只依赖接口和稳定工厂。

### 2. 单行 JSON 与安全上下文

日志固定包含 `timestamp`、`level`、`event`、`service`、`environment`，请求场景增加 `requestId`、operation、duration 和 outcome。所有 context 先经过递归脱敏与安全序列化；错误仅保留 name、message、stack 和有界 cause。

### 3. 请求关联兼容多运行时

Node 路径可用 `AsyncLocalStorage` 承载 request context；Edge/Worker 路径显式传递上下文，不假设 Node API 可用。tRPC context 生成或接收 request ID，并在响应中保留可关联标识。

### 4. 指标使用低基数标签

API 标签限于 procedure、method、outcome；数据库标签限于稳定 query name、operation、outcome；缓存标签限于 namespace、operation、outcome。禁止使用用户 ID、资源 ID、完整 URL、错误消息等高基数值。

### 5. 数据库采用命名操作包装

不全局 monkey patch Drizzle。关键 service 通过 `observeDbOperation(name, operation, fn)` 包装查询，以明确名称记录耗时和错误；这样兼容 LibSQL/Worker 且不会暴露 SQL 参数。

### 6. 观测失败 fail-open

adapter 调用被安全包装，日志或指标失败不得改变 API、数据库或外部服务结果。观测层不得用自身 Logger 递归报告 adapter 故障。

## Risks / Trade-offs

- [默认 noop 指标不持久化] → 保留稳定接口和 memory adapter；持久化由未来部署 adapter 解决。
- [手工命名数据库操作可能遗漏] → 建立命名清单和静态搜索，优先覆盖所有 Router service 及关键外部调用。
- [日志 context 意外包含秘密] → 默认拒绝未知复杂对象、递归脱敏并用专门测试覆盖秘密与个人字段。
- [Node 与 Worker 上下文行为不同] → 核心 API 不依赖隐式上下文，显式传递始终可用。

## Migration Plan

1. 实现核心接口、脱敏、错误序列化和测试 adapter。
2. 通过 instrumentation 初始化默认 adapter 和错误捕获。
3. 接入 tRPC 请求日志与 API 指标。
4. 接入数据库、缓存和外部服务 instrumentation。
5. 替换现有直接 `console.*` 调用并增加禁止规则。
6. 验证 adapter 故障不改变业务行为。

回滚可逐个移除业务接入点，保留核心接口；任何时候都不得用回滚恢复敏感信息日志。

## Open Questions

无。持久化指标与供应商 adapter 明确留给后续独立 change。
