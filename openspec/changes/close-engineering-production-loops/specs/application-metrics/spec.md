## ADDED Requirements

### Requirement: 默认指标必须形成安全结构化输出
系统 SHALL 在未注入外部 Metrics adapter 时，把 counter 和 duration 指标输出为单行 JSON，并 MUST 仅包含稳定指标名、操作、数值、服务、环境、时间和经过白名单过滤的低基数标签。

#### Scenario: 默认记录 API 耗时
- **WHEN** tRPC 中间件通过默认 Metrics 记录一次 API duration
- **THEN** 标准输出包含可解析的 metric JSON，且不包含请求体、用户标识、完整 URL、凭据或自由文本错误

#### Scenario: 调用者提供非法指标标签
- **WHEN** 指标调用包含未登记标签或高基数值
- **THEN** 默认输出丢弃非法标签且业务调用继续完成

### Requirement: 指标输出失败不得影响业务
默认和自定义 Metrics adapter MUST 继续经过安全包装，writer、序列化或 adapter 错误 MUST NOT 改变原业务调用的成功或失败结果。

#### Scenario: 标准输出 writer 抛错
- **WHEN** 默认指标 adapter 的 writer 在记录指标时抛出异常
- **THEN** 指标错误被隔离，调用指标的请求或数据库操作不额外失败
