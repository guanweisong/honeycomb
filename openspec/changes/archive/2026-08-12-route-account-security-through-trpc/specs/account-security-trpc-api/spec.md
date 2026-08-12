## ADDED Requirements

### Requirement: 自定义账号安全查询通过 tRPC 暴露

系统 SHALL 将应用自行实现的账号安全查询注册到 `appRouter`，并 MUST 使用 tRPC context 中经过验证的当前用户身份；Better Auth 定义的认证协议接口 MUST 保持独立。

#### Scenario: 已登录用户查询登录历史

- **WHEN** 已登录用户调用 `accountSecurity.loginHistory`
- **THEN** 系统仅返回该用户最近 50 条登录历史，并按发生时间倒序排列

#### Scenario: 未登录用户查询登录历史

- **WHEN** 未登录请求调用 `accountSecurity.loginHistory`
- **THEN** 系统在查询数据库前返回未认证错误

#### Scenario: 调用 Better Auth 认证能力

- **WHEN** 页面执行 Passkey、修改密码、会话管理或 OAuth 账号关联操作
- **THEN** 页面继续通过 Better Auth 客户端调用 `/api/auth/*` 协议接口，不经过 tRPC 包装

### Requirement: 登录历史响应保持 JSON 类型一致

系统 MUST 将登录历史发生时间作为 ISO 8601 字符串返回，并 SHALL 保持事件、认证方式、IP 和 User-Agent 字段不变。

#### Scenario: 返回包含时间的登录历史

- **WHEN** `accountSecurity.loginHistory` 返回数据库记录
- **THEN** 每条记录的 `createdAt` 是合法 ISO 8601 字符串，客户端类型与运行时值一致

### Requirement: 账号安全页使用统一查询客户端

系统 SHALL 使用项目 tRPC React Query 客户端加载登录历史，并 MUST 保持现有加载占位、空状态、错误提示与历史列表展示行为。

#### Scenario: 查询正在加载

- **WHEN** 登录历史 tRPC query 尚未完成
- **THEN** 页面展示现有 Skeleton 占位内容

#### Scenario: 查询失败

- **WHEN** 登录历史 tRPC query 返回错误
- **THEN** 页面提示登录历史加载失败且不渲染错误数据

#### Scenario: 查询返回空列表

- **WHEN** 登录历史 tRPC query 成功返回空列表
- **THEN** 页面展示“暂无登录历史”空状态

### Requirement: 登录历史使用中立账号安全领域包

系统 MUST 将登录历史模型、repository、查询限制和保留策略放在独立的账号安全领域包中；Auth 和 tRPC SHALL 依赖该领域包，账号安全领域包 MUST NOT 依赖 Auth 或 tRPC。

#### Scenario: Auth 记录认证事件

- **WHEN** Better Auth hooks 或请求审计需要记录登录、失败、退出事件
- **THEN** Auth 调用账号安全领域包写入记录，而不通过 tRPC

#### Scenario: tRPC 查询登录历史

- **WHEN** `accountSecurity.loginHistory` 查询当前用户历史
- **THEN** tRPC 调用账号安全领域包读取安全数据库列，而账号安全领域包不引用 tRPC 类型

#### Scenario: 识别 Better Auth 认证路径

- **WHEN** 系统需要将 Better Auth 路径映射为密码、Passkey、OAuth 或会话事件
- **THEN** 该协议识别逻辑保留在 Auth，且不承担登录历史存储职责
