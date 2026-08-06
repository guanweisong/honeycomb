## Context

现有 `protectedProcedure(levels)` 由每个 Router 直接列出允许角色。相同角色组合散布于 user、post、page、comment、media、menu 等模块，新增业务动作时难以集中审计。用户表和 JWT 中已有 `UserLevel`，因此本 change 保留角色作为身份属性，但把授权决策完全转移到集中 capability 映射。

## Goals / Non-Goals

**Goals:**

- 业务 procedure 只声明所需 Permission。
- 角色能力映射集中、穷尽、默认拒绝并可测试。
- 一步到位删除旧角色数组授权，不保留双轨。
- 前端能力可见性与服务端映射使用同一纯定义。
- 保持公开 API、输入输出和角色数据模型不变。

**Non-Goals:**

- 不允许数据库为单个用户覆盖权限。
- 不引入多租户、资源所有权 ABAC 或策略语言。
- 不把完整权限数组写入 JWT。
- 不改变现有 ADMIN、EDITOR、GUEST 的业务意图。

## Decisions

### 1. Permission 面向稳定业务动作

Permission 使用 `resource:action` 字符串并按实际受保护 procedure 建立，例如 `post:create`、`post:read-all`、`user:manage`。避免使用路由路径或组件名，避免把实现结构固化为权限契约。

### 2. 集中角色映射并默认拒绝

唯一 `ROLE_PERMISSIONS` 使用 `satisfies Record<UserLevel, readonly Permission[]>` 保证角色穷尽。未知角色、未知 Permission 或缺少映射都返回拒绝。ADMIN 可由全部 Permission 自动构造，测试确保新增 Permission 不会遗漏。

### 3. 服务端中间件是最终边界

`permissionProcedure(permission)` 是常用 API；复合授权通过显式 `permissionsProcedure(permissions, { mode })`，默认 mode 为 `all`。中间件先验证用户，再计算角色权限。前端 `can(role, permission)` 仅控制导航和按钮显示，不能替代 procedure 检查。

### 4. 一次性迁移

建立迁移矩阵后，在同一 change 中替换全部 `protectedProcedure([roles])`，随后删除旧函数并以静态搜索验证零残留。不使用兼容 wrapper、feature flag 或运行时双写。

### 5. 权限不固化进会话

JWT 继续保存用户 ID 和角色。请求上下文按现有逻辑重新查库确认状态和角色；授权时从当前代码映射计算 Permission，使权限调整在部署后即时一致。

## Risks / Trade-offs

- [能力映射错误造成越权或误拒绝] → 迁移前生成逐 procedure 旧角色矩阵，并用允许/拒绝参数化测试锁定等价结果。
- [一步迁移扩大单次变更面] → 按 Router 分批修改但只在全量迁移完成后交付，旧 API 删除作为编译门禁。
- [前端与服务端定义分叉] → 共享纯 Permission 和映射模块，服务端模块仅包装鉴权中间件。
- [未来需要资源级授权] → Permission 中间件保留清晰扩展点，但本 change 不提前实现 ABAC。

## Migration Plan

1. 提取现有所有受保护 procedure 及允许角色矩阵。
2. 定义 Permission、角色映射、`can` 和穷尽性测试。
3. 实现 capability procedure 和错误/指标接入。
4. 逐 Router 替换授权声明并执行矩阵测试。
5. 迁移管理后台导航和操作可见性。
6. 删除旧 `protectedProcedure`，静态检查零残留并运行全量验证。

授权变更不使用运行时回滚开关。若发布前验证失败，回滚整个提交；发布后发现问题则修正集中映射并重新部署。

## Open Questions

无。资源所有权和自定义角色明确不在本 change 范围。
