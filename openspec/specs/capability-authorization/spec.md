# Capability Authorization Specification

## Purpose

定义基于稳定业务能力的集中式授权模型，确保服务端默认拒绝并作为最终授权边界。

## Requirements

### Requirement: 权限使用稳定业务能力定义
系统 SHALL 使用稳定的 `resource:action` Permission 表达受保护操作，procedure MUST NOT 直接列出允许角色。
#### Scenario: 声明文章更新授权
- **WHEN** Router 定义文章更新 procedure
- **THEN** 它声明 `post:update` 能力而不是 ADMIN 或 EDITOR 角色数组

### Requirement: 角色能力映射集中且穷尽
系统 MUST 在唯一映射中定义每个 `UserLevel` 拥有的 Permission，并 MUST 在新增角色或 Permission 时通过类型或测试发现遗漏。
#### Scenario: 新增 Permission
- **WHEN** 开发者新增一个 Permission
- **THEN** ADMIN 全权限和角色能力矩阵测试要求明确处理该 Permission

### Requirement: Capability 授权默认拒绝
系统 MUST 拒绝未登录、禁用用户、未知角色、未知 Permission 和未授予能力的请求。
#### Scenario: EDITOR 调用用户管理
- **WHEN** EDITOR 调用要求 `user:manage` 的 procedure
- **THEN** 系统返回 `FORBIDDEN` 且不执行 handler
#### Scenario: ADMIN 执行受保护操作
- **WHEN** 已启用 ADMIN 调用已定义 Permission 的 procedure
- **THEN** 系统允许执行 handler

### Requirement: 复合能力模式显式
系统 SHALL 支持显式 `all` 或 `any` 的复合能力检查，且未声明 mode 时 MUST 使用 `all`。
#### Scenario: All 模式缺少一个能力
- **WHEN** procedure 要求两个 Permission 且用户仅拥有其中一个
- **THEN** 系统拒绝请求

### Requirement: 服务端是最终授权边界
系统 MUST 在每个受保护 procedure 内执行 capability 检查；前端导航或按钮隐藏 MUST NOT 替代服务端授权。
#### Scenario: 手工调用隐藏操作
- **WHEN** 用户绕过前端直接调用其无权访问的 procedure
- **THEN** 服务端返回 `FORBIDDEN`

### Requirement: 权限按当前角色计算
系统 SHALL 保持角色存储于用户数据和会话标识中，并在请求时按当前数据库角色及集中映射计算能力，MUST NOT 将权限数组固化进 JWT。
#### Scenario: 管理员修改用户角色
- **WHEN** 用户角色在数据库中被修改后发起新请求
- **THEN** 授权使用最新角色对应的能力

### Requirement: 旧角色数组授权完全移除
系统 MUST 在迁移完成时删除 `protectedProcedure([roles])` 及全部调用，不得保留兼容层、双轨授权或 feature flag。
#### Scenario: 扫描授权声明
- **WHEN** 执行静态检查
- **THEN** 仓库中不存在基于角色数组的 procedure 授权调用
