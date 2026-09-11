# Application Metrics Specification

## Purpose

定义 API、数据库、缓存和外部服务的低基数指标契约，包括稳定命名、标签限制、耗时统计与故障隔离，使生产运行状态能够被安全观察且不会泄露敏感数据。
## Requirements
### Requirement: API 指标记录请求结果和耗时
系统 SHALL 为每个 tRPC procedure 记录请求总数、耗时和错误数，并仅使用 procedure、method 和 outcome 等低基数标签。
#### Scenario: Procedure 返回权限错误
- **WHEN** capability 检查拒绝一个 tRPC 请求
- **THEN** API 指标记录对应 procedure、FORBIDDEN outcome 和请求耗时

### Requirement: 数据库指标使用稳定操作名
系统 SHALL 记录命名数据库操作的次数、耗时和错误，且 MUST NOT 将原始 SQL、参数、资源 ID 或错误消息作为指标标签。
#### Scenario: 命名查询成功
- **WHEN** 一个已 instrumentation 的数据库操作成功
- **THEN** 指标记录稳定 query name、operation、success outcome 和耗时

### Requirement: 缓存指标可计算命中率
系统 SHALL 分别记录缓存读取、命中、未命中、写入和错误，使 `hits / (hits + misses)` 可用于计算命中率。
#### Scenario: 缓存未命中后写入
- **WHEN** 缓存读取未命中且业务结果随后写入缓存
- **THEN** 指标分别增加 read、miss 和 write

### Requirement: 外部服务记录调用质量
系统 SHALL 为 CAPTCHA、邮件和对象存储调用记录次数、耗时与失败。
#### Scenario: 邮件服务失败
- **WHEN** 邮件发送返回错误
- **THEN** 指标记录 email operation 的失败和耗时，且不包含收件人地址

### Requirement: 指标标签限制高基数数据
系统 MUST 拒绝或丢弃用户 ID、资源 ID、完整 URL、请求 ID 和自由文本错误等高基数标签。
#### Scenario: 调用者传入非法标签
- **WHEN** 业务代码尝试将用户 ID 用作指标标签
- **THEN** 指标接口不输出该标签且业务调用不失败

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
