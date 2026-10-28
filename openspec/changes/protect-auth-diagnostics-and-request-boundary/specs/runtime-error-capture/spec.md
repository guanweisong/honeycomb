## ADDED Requirements

### Requirement: 认证 SDK 只记录白名单诊断

系统 MUST 为 Better Auth 使用专用安全 logger，保留诊断级别、固定操作和已审核的有限错误分类。系统 MUST NOT 输出 SDK 自由文本消息、SQL、参数、堆栈、任意错误属性或原始 cause；未知错误 MUST 保留通用诊断而不是关闭日志。日志故障 MUST NOT 改变认证或数据库异常语义。

#### Scenario: 会话查询错误包含敏感绑定

- **WHEN** SDK 记录包含合成会话 token、SQL 参数或嵌套 cause 的错误
- **THEN** 输出仅含允许的诊断字段，任何原始消息、绑定或 cause 内容都不出现，原业务错误继续传播

#### Scenario: 参数未知或日志输出失败

- **WHEN** SDK 参数包含未知字段、循环 cause、抛错属性或日志 sink 故障
- **THEN** 日志入口不会抛错影响认证，且不会回退到原始 console 输出

### Requirement: 后台认证读取等待真实请求

后台 app 请求所有者 MUST 在运行时预渲染期间阻止会话和用户数据库读取，真实请求到达后才继续；该边界 MUST NOT 被移入通用数据库或身份库。系统 MUST 保留请求内身份去重、未认证结果和未知错误传播。

#### Scenario: 运行时预渲染已具有请求头

- **WHEN** Next 运行时预渲染可以提供 headers 但尚未进入真实请求阶段
- **THEN** 后台认证入口等待请求，预渲染完成或取消时没有启动会话与用户查询

#### Scenario: 真实请求读取身份

- **WHEN** 真实请求进入后台认证入口
- **THEN** 当前请求头正常交给身份读取，已登录、匿名与未知失败的语义保持不变
