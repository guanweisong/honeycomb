## Context

重命名 Passkey 已使用 `packages/ui/extended/Dialog` 并在成功后 refetch；删除分支仍使用 `window.confirm`，且成功后仅 toast。

## Goals / Non-Goals

**Goals:**

- 统一删除确认交互。
- 保证服务端删除成功后客户端列表重新请求。

**Non-Goals:**

- 不改变删除 API、文案以外的账号安全功能或列表缓存策略。

## Decisions

- 复用现有受控 `Dialog`，以 `deleteTarget` 保存待删凭据；确认按钮调用现有删除 endpoint。
- 仅在 endpoint 成功后执行 `refetch`，随后清理目标状态；失败时保持 Dialog 打开以便重试。

## Risks / Trade-offs

- [Dialog 自动关闭导致失败时无法重试] → 删除函数仅在成功后返回，失败时抛出/拒绝关闭由调用方处理。
