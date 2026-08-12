## ADDED Requirements

### Requirement: Passkey 删除使用统一确认框
系统 MUST 使用扩展 Dialog 组件确认删除 Passkey，不得使用浏览器原生确认框。

#### Scenario: 请求删除 Passkey
- **WHEN** 用户点击某个 Passkey 的删除按钮
- **THEN** 系统显示包含该操作确认按钮的危险操作 Dialog，且不调用浏览器原生确认框

### Requirement: 删除成功后同步列表
系统 SHALL 在 Passkey 删除请求成功后刷新列表、关闭确认 Dialog 并提示成功。

#### Scenario: 确认删除成功
- **WHEN** 用户在确认 Dialog 中执行删除且 Better Auth 返回成功
- **THEN** 系统调用删除 endpoint、重新获取 Passkey 列表并关闭 Dialog

#### Scenario: 删除失败
- **WHEN** 删除 endpoint 返回错误
- **THEN** 系统显示失败提示、保持确认 Dialog 打开且不刷新列表
