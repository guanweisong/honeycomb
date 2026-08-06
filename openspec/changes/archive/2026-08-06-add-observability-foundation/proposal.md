## Why

当前错误主要通过零散的 `console` 输出，无法稳定关联请求、统计接口与数据库耗时，也无法量化缓存命中率。需要建立无供应商绑定的结构化日志与指标接口，使运行问题可观测，同时保留未来接入任意平台的自由。

## What Changes

- 新增稳定的 `Logger`、`Metrics`、事件名和指标名接口，并提供 console、noop 和内存测试 adapter。
- 统一 JSON 日志字段、错误序列化、请求关联和敏感信息脱敏规则。
- 在 tRPC 中间件记录请求次数、耗时、结果和未处理错误。
- 在数据库访问边界记录命名查询的次数、耗时和错误，禁止记录原始 SQL 参数。
- 为 Upstash 缓存记录命中、未命中、写入和错误指标，并可计算缓存命中率。
- 为邮件、验证码和对象存储等外部服务记录调用耗时与失败。
- 通过 Next.js instrumentation 初始化观测组件并捕获服务端请求错误。
- 将业务代码中的直接 `console.*` 调用迁移到统一日志接口。

## Capabilities

### New Capabilities

- `structured-logging`: 规定结构化日志、请求关联、错误序列化和脱敏行为。
- `application-metrics`: 规定 API、数据库、缓存及外部服务的低基数指标。
- `runtime-error-capture`: 规定 tRPC 和 Next.js 服务端错误的统一捕获与上报边界。

### Modified Capabilities

无。

## Impact

- 影响 tRPC core/context、数据库访问、缓存、邮件、验证码、对象存储和服务端 instrumentation。
- 新增观测核心接口与 adapter，但不绑定 Sentry、OpenTelemetry 或任何云平台 SDK。
- 默认日志写标准输出；指标 adapter 故障不得改变业务请求结果。
- 本 change 依赖 `harden-runtime-foundations` 已建立的服务端边界和启动入口。
