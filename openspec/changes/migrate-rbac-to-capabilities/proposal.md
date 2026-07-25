## Why

当前受保护 API 直接在每个 procedure 中声明允许角色，角色与业务动作紧耦合，难以集中审计和演进。需要改为 capability-based authorization，使业务接口声明所需能力，并由唯一的角色能力映射决定授权结果。

## What Changes

- 新增稳定、面向业务动作的 `Permission` 定义和集中式 `Role -> Permission[]` 映射。
- 新增默认拒绝的 capability 授权中间件，支持单权限及显式的 all/any 复合权限模式。
- **BREAKING** 一次性将所有受保护 procedure 从角色数组授权迁移为 capability 授权。
- **BREAKING** 删除旧 `protectedProcedure([roles])` API，不保留兼容层、双轨授权或 feature flag。
- 管理后台导航和操作可见性使用相同能力模型，但服务端继续作为最终授权边界。
- 增加完整角色能力矩阵、procedure 允许/拒绝和未知角色测试。

## Capabilities

### New Capabilities

- `capability-authorization`: 规定权限定义、角色映射、默认拒绝、服务端授权和前端能力可见性。

### Modified Capabilities

- `api-security-boundaries`: 将后台 API 的授权契约从直接角色判断调整为 capability 判断，同时保持公开数据和资源可见性边界。

## Impact

- 影响 tRPC core、全部受保护 Router、当前用户上下文、管理后台导航和操作按钮。
- 用户数据仍保存 `UserLevel` 角色；权限不写入 JWT，而在服务端由集中映射计算。
- 所有调用旧 `protectedProcedure` 的模块必须在同一 change 中迁移完成。
- 本 change 依赖 `add-observability-foundation`，以记录稳定的授权拒绝事件和指标。
