## MODIFIED Requirements

### Requirement: 用户 API 使用安全响应字段
系统 SHALL 在用户创建、更新和列表接口中仅返回业务所需字段，并且 MUST NOT 返回密码哈希；用户管理 procedure MUST 要求对应 capability，而不得直接按角色数组授权。

#### Scenario: 创建用户返回安全 DTO
- **WHEN** 具有 `user:manage` 能力的用户成功创建用户
- **THEN** 响应包含用户管理所需字段且不包含 `password`

#### Scenario: 更新用户返回安全 DTO
- **WHEN** 具有 `user:manage` 能力的用户成功更新用户
- **THEN** 响应包含用户管理所需字段且不包含 `password`

#### Scenario: 缺少能力访问用户列表
- **WHEN** 已登录用户缺少用户读取能力并调用用户列表接口
- **THEN** 系统返回权限错误且不返回用户邮箱

## ADDED Requirements

### Requirement: 后台 API 以 capability 作为授权契约
系统 MUST 为每个后台读取和写入 procedure 声明所需 Permission，并在 handler 执行前完成检查。

#### Scenario: 有能力的编辑者更新文章
- **WHEN** EDITOR 拥有 `post:update` 并调用文章更新接口
- **THEN** 系统允许继续执行既有输入校验和更新流程

#### Scenario: 无能力用户调用后台接口
- **WHEN** 用户已登录但缺少目标 procedure 所需 Permission
- **THEN** 系统返回 `FORBIDDEN` 且不读取或修改目标资源
