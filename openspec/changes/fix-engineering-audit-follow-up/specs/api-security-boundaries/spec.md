## ADDED Requirements

### Requirement: 限流只使用可信入口的客户端地址

API 限流、认证限流和登录历史 MUST 以已验证的可信入口地址为依据。无法确认客户端地址时使用有界的匿名回退。

#### Scenario: 请求伪造代理头

- **WHEN** 自托管入口未设可信代理层数或请求伪造了可信边界左侧的值
- **THEN** 系统不使用伪造值作为新的限流身份

## MODIFIED Requirements

### Requirement: 评论关系保持单一目标和同源父子关系

系统 MUST 要求评论仅关联一个非空目标，并且回复评论 MUST 与父评论关联同一个资源。

#### Scenario: 输入包含多个评论目标

- **WHEN** 评论输入同时包含多个 `postId`、`pageId` 或 `customId`
- **THEN** 输入校验失败且不访问数据库

#### Scenario: 回复其他资源的评论

- **WHEN** 新评论的目标与父评论目标不一致
- **THEN** 系统返回 `BAD_REQUEST` 且不插入评论或发送通知

#### Scenario: 回复同一资源的评论

- **WHEN** 新评论与父评论的资源标识完全一致
- **THEN** 系统允许创建回复并按已验证收件人规则发送通知
