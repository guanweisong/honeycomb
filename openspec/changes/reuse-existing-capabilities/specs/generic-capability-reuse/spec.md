## ADDED Requirements

### Requirement: 通用能力复用保留业务行为

系统 SHALL 优先复用现有依赖和平台能力，替换时 MUST 保留业务权限、异步会话隔离、事务、失败语义及公开输出格式。

#### Scenario: 媒体重置与分页同时触发

- **WHEN** 管理员重置媒体列表且滚动哨兵在同一轮触发
- **THEN** 系统请求第一页，不被迟到下一页或旧账号数据覆盖；刷新失败仍保留可见列表供重试。

#### Scenario: 日期格式替换

- **WHEN** 在不同主机时区格式化既有输入和 token
- **THEN** UTC 日期、命名月份、字面量、小年份与非法值空串保持原契约。

#### Scenario: 表单与编辑器订阅统一

- **WHEN** 通过按钮或 imperative API 提交异步表单，或真实编辑器选区/marks 改变
- **THEN** 提交状态覆盖未完成 promise，编辑器工具栏及时反映状态；业务提交锁不被删除。

### Requirement: 测试装配复用不降低证据

测试体系 MUST 保留竞态、安全、真实传输和数据库隔离断言；库替换无法保留行为时 SHALL 暂缓并说明原因。

#### Scenario: 超时和异步装配共享

- **WHEN** 使用共享超时 helper 或受控 Promise
- **THEN** 每个信号保持独立 deadline 和错误理由，resolve/reject 时机仍由用例控制，真实 SDK/fetch 断言保留。

#### Scenario: 候选不等价

- **WHEN** 导航 pending 或符号链接扫描的候选 API 与原有语义不同
- **THEN** 保留原语义而不强制替换，不新增为掩盖差异而存在的复杂包装。
