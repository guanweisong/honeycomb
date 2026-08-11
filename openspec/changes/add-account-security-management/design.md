## Context

当前项目使用 Better Auth，已启用用户名密码、可配置的 Google/GitHub/Apple OAuth、Passkey、会话管理和账号关联。账号安全页目前已提供 Passkey、修改密码和当前会话管理，但缺少 OAuth 关联账号管理和历史安全事件查询。

Better Auth 的 `account` 表已经保存每个用户的认证方式，适合直接使用 `listAccounts`、`linkSocial` 和 `unlinkAccount` 管理关联账号。登录历史不能从 `session` 表推导，因为会话删除后记录会消失，且失败登录不会创建会话，因此需要独立的不可变事件表。

## Goals / Non-Goals

**Goals:**

- 让用户查看、显式绑定和解绑已配置的 OAuth 登录方式。
- 禁止解绑后失去全部登录方式。
- 关闭 OAuth 隐式关联，要求用户主动确认关联。
- 记录成功登录、失败登录、主动退出和退出其他设备。
- 在账号安全页展示最近登录历史，并隔离不同用户的数据。

**Non-Goals:**

- 本次不新增 TOTP/二次验证。
- 本次不实现登录地点地图、设备指纹或风险评分。
- 本次不允许用户修改邮箱或删除账号。
- 本次不记录密码、OAuth token、完整登录标识符等敏感信息。

## Decisions

### 账号关联

- 在 `auth.ts` 中设置 `account.accountLinking.disableImplicitLinking = true`，避免同邮箱 OAuth 登录静默改变账号关系。
- 使用 Better Auth 客户端原生的 `listAccounts`、`linkSocial` 和 `unlinkAccount`，不复制 OAuth 回调流程。
- 账号安全页从服务端只向客户端传递已配置的 provider id，不暴露 OAuth secret；客户端只展示实际启用的 provider。
- 绑定通过 provider OAuth 跳转完成，回调回到账号安全页；解绑使用项目封装的 `Dialog` 二次确认。
- 不允许解绑用户的最后一个 account，沿用 Better Auth 的安全保护；如果用户只有 OAuth 登录方式，页面不提供危险的“全部解绑”选项。

### 登录历史

- 新增 `login_history` 表，字段包括：`id`、可空 `user_id`、`event`、`provider`、`ip_address`、`user_agent`、`created_at`。
- `event` 使用固定值：`LOGIN_SUCCESS`、`LOGIN_FAILURE`、`SIGN_OUT`、`REVOKE_OTHER_SESSIONS`。
- `created_at` 使用整数毫秒时间戳，避免 Better Auth 日期字段和项目通用 ISO 文本时间字段混用。
- 成功登录通过 Better Auth session create hook 记录；主动退出和退出其他设备通过认证请求路径记录；失败登录通过认证 Route Handler 的响应结果记录，因为失败登录不会触发 session create。
- 失败登录只在能够安全解析到现有用户时关联 `user_id`；未知用户名的失败事件不归属于任何用户，避免保存原始输入并防止账号枚举信息泄露。
- 查询接口只允许当前登录用户读取自己的记录，默认按时间倒序返回最近 50 条。

### 页面结构

- 账号安全页新增“关联账号”和“登录历史”两个 Tab。
- 关联账号和登录历史分别使用独立组件，沿用现有 `Tabs` 封装、`Dialog` 封装和 `Skeleton` 加载态。
- 登录历史展示认证方式、事件、IP、User-Agent 和本地化时间；不展示 token、密码或 OAuth 凭据。

## Risks / Trade-offs

- [OAuth 回调失败] → 绑定按钮只在 provider 已配置时展示，并对 Better Auth 错误给出可读提示；不在客户端自行拼接 OAuth URL。
- [失败登录无法确定用户] → 只对可解析的现有用户名/邮箱关联 user id，未知身份仅保留不可归属的安全事件。
- [审计表持续增长] → 查询限制最近 50 条，并在写入时清理超过 90 天的历史记录。
- [Hook 与认证路径耦合] → 将事件分类和落库封装为独立服务，并为每类认证事件添加单元测试。
- [显式关联改变已有 OAuth 行为] → 部署说明中明确同邮箱 OAuth 不再自动关联；已有已关联 account 不受影响。

## Migration Plan

1. 发布新增 `login_history` 表及索引的数据库迁移。
2. 发布 Better Auth 的 `disableImplicitLinking` 配置和事件记录逻辑。
3. 发布账号安全页面的新 Tab 和查询接口。
4. 部署后验证用户名密码、Passkey、OAuth 登录成功/失败、主动退出和退出其他设备事件。
5. 若需要回滚，先隐藏新 Tab，再回滚应用代码；登录历史表保留，不影响现有认证数据。

## Open Questions

- 失败登录关联到已有用户时，查询页面是否需要单独标记“可能是他人尝试登录”，当前设计使用统一的“登录失败”事件。
