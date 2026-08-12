# Login History

## Purpose

定义认证和会话事件的安全记录、当前用户隔离查询、事件保留范围，以及不暴露密码、令牌等认证凭据的展示规则。

## Requirements

### Requirement: 记录登录历史事件

系统 SHALL 记录成功登录、失败登录、主动退出和退出其他设备事件，并保存事件类型、认证方式、IP、User-Agent 和发生时间。

#### Scenario: 成功登录

- **WHEN** 用户通过用户名密码、OAuth 或 Passkey 登录成功
- **THEN** 系统写入一条 `LOGIN_SUCCESS` 事件并关联当前用户

#### Scenario: 失败登录

- **WHEN** 用户的用户名密码、OAuth 或 Passkey 登录失败
- **THEN** 系统写入一条 `LOGIN_FAILURE` 事件，不保存密码、token 或原始敏感输入

#### Scenario: 主动退出

- **WHEN** 用户主动退出当前设备
- **THEN** 系统写入一条 `SIGN_OUT` 事件

#### Scenario: 退出其他设备

- **WHEN** 用户确认退出其他设备
- **THEN** 系统写入一条 `REVOKE_OTHER_SESSIONS` 事件

### Requirement: 查询当前用户登录历史

系统 SHALL 只允许已登录用户查询自己的登录历史，并按时间倒序返回最近 50 条记录。

#### Scenario: 查询成功

- **WHEN** 已登录用户请求登录历史
- **THEN** 系统返回该用户自己的历史记录，不返回其他用户记录

#### Scenario: 未认证查询

- **WHEN** 请求未携带有效会话
- **THEN** 系统拒绝请求并返回未认证结果

#### Scenario: 无历史记录

- **WHEN** 用户没有任何可归属的历史事件
- **THEN** 系统返回空列表，不返回错误

### Requirement: 登录历史安全展示

系统 SHALL 在账号安全页展示事件类型、认证方式、IP、User-Agent 和本地化时间，并 SHALL 隐藏认证凭据。

#### Scenario: 展示安全字段

- **WHEN** 用户打开“登录历史”Tab
- **THEN** 页面展示事件、认证方式、IP、User-Agent 和发生时间

#### Scenario: 不展示敏感字段

- **WHEN** 页面渲染任意登录历史记录
- **THEN** 页面不展示密码、session token、OAuth access token 或 refresh token
