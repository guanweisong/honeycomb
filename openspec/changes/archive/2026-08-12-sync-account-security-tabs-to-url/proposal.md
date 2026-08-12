## Why

账号安全页的标签页状态只保存在浏览器内存中。用户刷新页面、使用浏览器前进后退，或希望分享某个安全功能的直达链接时，无法保留当前所在的内容。

## What Changes

- 为账号安全页的标签页引入 `tab` 查询参数。
- 在用户切换标签时更新 URL，并支持浏览器历史导航。
- 对缺失或不支持的标签参数回退到 Passkey，保证链接稳健可用。

## Capabilities

### New Capabilities

- `account-security-tab-navigation`: 账号安全标签页与 URL 查询参数同步。

### Modified Capabilities

- 无。

## Impact

- 影响 `src/app/admin/(root)/(dashboard)/account/security` 的页面、标签组件和组件测试。
- 不涉及认证接口、数据模型或数据库迁移。
