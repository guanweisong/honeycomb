## Why

当前账号安全页只能管理 Passkey、密码和当前有效会话，无法查看或管理已关联的 Google、GitHub、Apple 登录方式，也无法追溯异常登录、退出等安全事件。项目已经启用 OAuth 账号关联和 Better Auth 会话体系，现在补充这两类能力可以让账号安全管理闭环。

## What Changes

- 新增“关联账号”能力，展示实际启用的 OAuth 提供商，并支持显式绑定和解绑。
- 关闭 OAuth 的隐式账号关联，要求用户从账号安全页主动确认关联。
- 新增登录历史记录，记录成功登录、失败登录、主动退出和退出其他设备事件。
- 新增登录历史查询接口和账号安全页面展示，包含认证方式、IP、User-Agent、时间和结果。
- 对关联账号解绑增加最后登录方式保护，避免用户失去全部登录入口。
- 扩展账号安全页面 Tab，加入“关联账号”和“登录历史”。

## Capabilities

### New Capabilities

- `account-linking`: 管理当前用户的 OAuth 关联账号，以及绑定、解绑和最后登录方式保护。
- `login-history`: 记录并查询用户的认证与会话安全事件。

### Modified Capabilities

- `better-authentication`: OAuth 账号关联改为显式关联；认证和会话事件需要写入登录历史。

## Impact

- Better Auth 配置和客户端认证能力。
- 账号安全页面及新的关联账号、登录历史组件。
- 数据库新增登录历史表及索引。
- Better Auth Route Handler、认证事件记录逻辑和安全查询接口。
- 现有 OAuth 登录行为：同邮箱账号不再静默自动关联，需从账号安全页主动绑定。
