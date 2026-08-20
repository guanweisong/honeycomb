## ADDED Requirements

### Requirement: 核心聚合必须维护业务不变量
Post、Comment、User 聚合 MUST 通过领域行为维护发布状态、审核状态和高权限用户保护等核心不变量，application 不得绕过聚合直接修改这些状态。

#### Scenario: 非法状态流转
- **WHEN** 用例尝试执行不符合状态机的发布、审核或账号状态变更
- **THEN** 聚合 MUST 拒绝操作并返回可识别的领域错误

### Requirement: 聚合持久化必须通过端口
聚合 MUST 通过模块定义的 repository port 读取和保存，Drizzle adapter 不得泄漏到 domain 或 application。

#### Scenario: 使用 fake repository 执行用例
- **WHEN** 测试向用例注入 fake repository
- **THEN** 用例 MUST 在无数据库环境下完成领域行为验证
