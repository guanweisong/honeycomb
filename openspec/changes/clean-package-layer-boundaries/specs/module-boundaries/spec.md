## MODIFIED Requirements

### Requirement: 评论 API 使用薄 Router
系统 SHALL 让评论 Router 仅声明 procedure、权限和输入，并由 service 模块负责查询、目标校验、DTO 和通知触发，同时 MUST 保持所有公开 API 契约不变。通知能力 MUST 独立于 tRPC 工具层和评论展示组件。

#### Scenario: 调用现有评论 procedure
- **WHEN** 客户端调用 `index`、`listByRef`、`create`、`update` 或 `destroy`
- **THEN** procedure 名称、输入、输出、权限和错误码与重构前一致

#### Scenario: 创建评论并发送通知
- **WHEN** 公共评论通过目标及父子关系校验并成功写入
- **THEN** 系统返回相同公共 DTO，并按原有规则通过独立通知能力发送管理员和回复通知

#### Scenario: 拒绝无效评论目标
- **WHEN** 评论目标未发布、禁止评论或父评论属于其他资源
- **THEN** 系统保持原有 `NOT_FOUND`、`FORBIDDEN` 或 `BAD_REQUEST` 行为
