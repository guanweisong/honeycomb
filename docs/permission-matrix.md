# 权限矩阵

Honeycomb 使用 capability-based authorization。用户数据和会话中只保存 `ADMIN`、`EDITOR`、`GUEST` 角色，角色在请求时通过 `src/packages/auth/permissions.ts` 中唯一的 `ROLE_PERMISSIONS` 映射为 Permission；权限数组不会固化进 JWT。

前端通过共享的 `can` / `useCan` 隐藏无权访问的导航和操作，但这不是安全边界。每个受保护的 tRPC procedure 都必须使用 `permissionProcedure` 或 `permissionsProcedure` 在 handler 执行前检查 capability；绕过或伪造前端请求仍会由服务端以 `UNAUTHORIZED` 或 `FORBIDDEN` 拒绝。禁用用户会在请求上下文回库时被移除，unknown role、unknown Permission 和空 Permission 集均默认拒绝。

## 角色矩阵

当前共 32 项 Permission。`✓` 表示角色拥有该能力，`—` 表示服务端必须拒绝。ADMIN 自动拥有 `Permission` 定义中的全部能力；EDITOR 和 GUEST 必须在集中映射中显式列出。

| Permission          | ADMIN | EDITOR | GUEST |
| ------------------- | :---: | :----: | :---: |
| `category:read-all` |   ✓   |   ✓    |   ✓   |
| `category:create`   |   ✓   |   ✓    |   —   |
| `category:delete`   |   ✓   |   ✓    |   —   |
| `category:update`   |   ✓   |   ✓    |   —   |
| `comment:read-all`  |   ✓   |   ✓    |   ✓   |
| `comment:moderate`  |   ✓   |   —    |   —   |
| `link:read-all`     |   ✓   |   ✓    |   ✓   |
| `link:create`       |   ✓   |   —    |   —   |
| `link:delete`       |   ✓   |   —    |   —   |
| `link:update`       |   ✓   |   —    |   —   |
| `media:read-all`    |   ✓   |   ✓    |   ✓   |
| `media:upload`      |   ✓   |   ✓    |   —   |
| `media:delete`      |   ✓   |   ✓    |   —   |
| `menu:read-all`     |   ✓   |   ✓    |   ✓   |
| `menu:update`       |   ✓   |   ✓    |   —   |
| `page:read-all`     |   ✓   |   ✓    |   ✓   |
| `page:create`       |   ✓   |   ✓    |   —   |
| `page:delete`       |   ✓   |   ✓    |   —   |
| `page:update`       |   ✓   |   ✓    |   —   |
| `post:read-all`     |   ✓   |   ✓    |   ✓   |
| `post:create`       |   ✓   |   ✓    |   —   |
| `post:delete`       |   ✓   |   ✓    |   —   |
| `post:update`       |   ✓   |   ✓    |   —   |
| `post:manage-tags`  |   ✓   |   ✓    |   —   |
| `setting:update`    |   ✓   |   —    |   —   |
| `statistics:read`   |   ✓   |   ✓    |   ✓   |
| `tag:create`        |   ✓   |   ✓    |   —   |
| `tag:delete`        |   ✓   |   —    |   —   |
| `tag:update`        |   ✓   |   ✓    |   —   |
| `user:read-self`    |   ✓   |   ✓    |   ✓   |
| `user:read-all`     |   ✓   |   ✓    |   —   |
| `user:manage`       |   ✓   |   —    |   —   |

## 复合能力

单一能力使用 `permissionProcedure(permission)`。多个能力使用 `permissionsProcedure(permissions, { mode })`：

- `mode: "all"` 要求全部能力；省略 `mode` 时也使用 `all`。
- `mode: "any"` 要求至少一个能力。
- 空 Permission 集不代表公开访问，而是默认拒绝。

## 新增权限流程

1. 在 `src/packages/auth/permissions.ts` 的 `Permission` 中新增稳定的 `resource:action` 业务能力，不使用页面、组件或路由路径命名。
2. 明确 EDITOR 和 GUEST 是否应拥有该能力并更新 `ROLE_PERMISSIONS`；ADMIN 由 `ALL_PERMISSIONS` 自动获得全部能力。
3. 在每个执行该业务动作的服务端 procedure 上声明 Permission，并为允许、拒绝以及 handler 不执行的边界补测试。禁止恢复 `UserLevel` 比较或角色数组 procedure 授权。
4. 仅在需要改善体验时，用共享 `can` / `useCan` 将同一 Permission 绑定到后台导航或操作按钮；前端检查不能替代第 3 步。
5. 更新本矩阵，并运行角色快照、procedure 矩阵、静态授权门禁、类型检查、Lint、全量单测、生产构建及管理后台 E2E。
