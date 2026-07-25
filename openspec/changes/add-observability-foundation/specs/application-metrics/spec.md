## ADDED Requirements

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
