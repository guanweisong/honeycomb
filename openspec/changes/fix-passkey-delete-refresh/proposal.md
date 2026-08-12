## Why

Passkey 删除仍使用浏览器原生确认框，和账号安全页已有的统一 Dialog 交互不一致；删除成功后也没有刷新列表，导致已删除设备继续显示。

## What Changes

- 使用扩展 Dialog 组件确认 Passkey 删除。
- 删除成功后刷新 Passkey 列表并关闭确认框。
- 为删除成功和失败行为添加回归测试。

## Capabilities

### New Capabilities

- `passkey-delete-feedback`: 定义 Passkey 删除确认和成功后的列表同步行为。

### Modified Capabilities

- `better-authentication`: 增加已登录用户管理其 Passkey 的删除交互要求。

## Impact

- 影响账号安全页的 Passkey 设置客户端组件及其测试；不改变 Better Auth API 或数据库。
