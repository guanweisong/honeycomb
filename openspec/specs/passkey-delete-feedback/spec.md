# Passkey Delete Feedback

## Purpose

定义删除 Passkey 时必须使用的统一危险操作确认交互、失败时保持对话框的反馈规则，以及成功后凭据列表同步行为。

## Requirements

### Requirement: Passkey 删除使用统一确认框

系统 MUST 使用扩展 Dialog 组件确认删除 Passkey，不得使用浏览器原生确认框。

#### Scenario: 请求删除 Passkey

- **WHEN** 用户点击某个 Passkey 的删除按钮
- **THEN** 系统显示包含该操作确认按钮的危险操作 Dialog，且不调用浏览器原生确认框

### Requirement: 删除成功后同步列表

系统 SHALL 在 Passkey 删除请求明确成功后关闭确认 Dialog 并提示成功，再独立刷新列表；刷新失败 MUST NOT 撤销成功反馈或重开确认框。未知结果与旧响应隔离遵循 [账号写入反馈](../account-mutation-feedback/spec.md)。

#### Scenario: 确认删除成功

- **WHEN** 用户在确认 Dialog 中执行删除且 Better Auth 返回成功
- **THEN** 系统关闭 Dialog、提示删除成功并重新获取 Passkey 列表；刷新失败仅提示已完成但需核对列表

#### Scenario: 删除失败

- **WHEN** 删除 endpoint 返回错误
- **THEN** 系统显示失败提示、保持确认 Dialog 打开且不刷新列表
