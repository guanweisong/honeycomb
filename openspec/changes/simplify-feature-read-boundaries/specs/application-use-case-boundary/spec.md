## ADDED Requirements

### Requirement: 简单只读查询不得保留纯转发的 Application 包装

只执行参数透传并原样返回 Query/Repository 结果的只读函数 MUST NOT 作为独立 Application 用例保留；调用方 MUST 直接调用实际读取入口。包含业务策略、授权、校验、缓存、映射、错误转换或多步协调的查询 MAY 保留在 Application。

#### Scenario: Router 查询只转发 Repository

- **WHEN** Router 的读取处理器只需将输入和可见性选项传给 Query/Repository
- **THEN** 它 MUST 直接调用 Query/Repository，且不得经过只转发参数的 Application 函数

#### Scenario: 公开读取需要业务目标校验

- **WHEN** 读取前需要确认评论目标公开且允许访问
- **THEN** Application MUST 保留目标策略校验，并在通过后读取 Repository

### Requirement: 所有 Feature 写入传输入口必须调用 Application 用例

每个 Feature 的 tRPC mutation handler MUST 调用本 Feature Application 中承担该操作的可执行函数；handler MUST NOT 直接执行业务状态变更或相关副作用。自动化边界测试 MUST 覆盖目录中发现的全部 Feature，而不能只依赖固定 Feature 名单或旧 service 文件名。

#### Scenario: 新增 Feature mutation

- **WHEN** 新 Feature 新增包含 `.mutation()` 的 Router
- **THEN** 架构测试 MUST 自动发现该 Feature，并要求 mutation handler 调用其 Application 用例

#### Scenario: mutation 直接写入

- **WHEN** mutation handler 不调用任何本 Feature Application 可执行函数而直接写入或编排副作用
- **THEN** 架构测试 MUST 失败并指出 Router 与处理器位置
