## ADDED Requirements

### Requirement: 已认证用户注册 Passkey

系统 SHALL 只允许已登录且状态为 ENABLE 的用户注册 Passkey，并将新凭据关联到当前用户。

#### Scenario: 注册 Passkey 成功

- **WHEN** 已登录的启用用户在安全设置中完成浏览器 WebAuthn 验证
- **THEN** 系统保存 Passkey 公钥凭据并将其关联到当前用户

#### Scenario: 未登录用户注册被拒绝

- **WHEN** 未登录用户调用 Passkey 注册接口
- **THEN** 系统拒绝请求且不创建 Passkey 记录

#### Scenario: 禁用用户注册被拒绝

- **WHEN** 已登录但状态不是 ENABLE 的用户调用 Passkey 注册接口
- **THEN** 系统拒绝请求且不创建 Passkey 记录

### Requirement: 用户管理自己的 Passkey

系统 SHALL 只返回当前用户的 Passkey，并允许当前用户重命名和删除自己的 Passkey。

#### Scenario: 查看 Passkey 列表

- **WHEN** 已登录用户打开安全设置
- **THEN** 系统只返回该用户关联的 Passkey 名称、设备信息和创建时间，不返回私钥材料

#### Scenario: 重命名 Passkey

- **WHEN** 用户提交自己 Passkey 的新名称
- **THEN** 系统更新该 Passkey 名称且不改变凭据公钥

#### Scenario: 删除自己的 Passkey

- **WHEN** 用户删除自己的一条 Passkey
- **THEN** 系统删除该凭据且不能影响其他用户的 Passkey

#### Scenario: 操作他人 Passkey 被拒绝

- **WHEN** 用户尝试读取、重命名或删除其他用户的 Passkey
- **THEN** 系统拒绝请求

### Requirement: Passkey 登录

系统 SHALL 在登录页提供 Passkey 登录，并在认证成功后创建 Better Auth 会话。

#### Scenario: 支持 Passkey 的浏览器登录成功

- **WHEN** 用户在支持 WebAuthn 的浏览器中完成有效 Passkey 验证
- **THEN** 系统创建会话并跳转到目标后台页面

#### Scenario: 无效 Passkey 登录失败

- **WHEN** Passkey 验证失败、凭据不存在或挑战过期
- **THEN** 系统拒绝登录且不创建会话

#### Scenario: 不支持 WebAuthn 的浏览器

- **WHEN** 浏览器不支持 WebAuthn
- **THEN** 登录页隐藏 Passkey 入口并继续显示用户名密码登录

### Requirement: Passkey 用户状态校验

系统 SHALL 对 Passkey 登录执行与其他登录方式一致的用户状态校验。

#### Scenario: 禁用用户使用 Passkey 登录

- **WHEN** Passkey 对应用户状态不是 ENABLE
- **THEN** 系统拒绝建立会话

### Requirement: WebAuthn 来源配置

系统 SHALL 使用正式站点的 WebAuthn RP ID 和 Origin 校验 Passkey 注册与登录请求。

#### Scenario: 正式来源请求

- **WHEN** 请求来源为 `https://www.guanweisong.com`
- **THEN** 系统允许执行 WebAuthn challenge 和验证流程

#### Scenario: 非信任来源请求

- **WHEN** 请求来源不符合配置的 WebAuthn Origin
- **THEN** 系统拒绝 WebAuthn 请求
