# 权限矩阵

Honeycomb 使用 capability-based authorization。用户数据和会话中只保存 `ADMIN`、`EDITOR`、`GUEST` 角色，角色在请求时通过 `src/lib/auth/permissions.ts` 中唯一的 `ROLE_PERMISSIONS` 映射为 Permission；权限数组不会固化进 JWT。Capability 只接受登记表中的稳定 `resource:action` 值，旧属性名（例如 `postReadAll`）不再作为兼容输入。

前端通过共享的 `can` / `useCan` 隐藏无权访问的导航和操作，但这不是安全边界。后台 route 由服务端 template 根据 proxy 注入并覆盖的 pathname 执行同一 capability 检查；每个受保护的 tRPC procedure 仍必须使用 `permissionProcedure` 或 `permissionsProcedure` 在 handler 执行前检查 capability。绕过或伪造前端请求会由服务端以重定向、`UNAUTHORIZED` 或 `FORBIDDEN` 拒绝。禁用用户会在请求上下文回库时被移除，unknown route、unknown role、unknown Permission 和空 Permission 集均默认拒绝。

用户账号保护属于 User 领域规则：管理员账号不能被删除或降级；具备 `user:manage` 的管理员可以修改其他管理员账号的启用状态。User server 操作在持久化前执行这些业务规则；调用方必须显式传入操作者级别，不使用访客默认值。

## 角色矩阵

当前共 35 项 Permission。`✓` 表示角色拥有该能力，`—` 表示服务端必须拒绝。ADMIN 自动拥有 `Permission` 定义中的全部能力；EDITOR 和 GUEST 必须在集中映射中显式列出。

| Permission              | ADMIN | EDITOR | GUEST |
| ----------------------- | :---: | :----: | :---: |
| `category:read-all`     |   ✓   |   ✓    |   ✓   |
| `category:create`       |   ✓   |   ✓    |   —   |
| `category:delete`       |   ✓   |   ✓    |   —   |
| `category:update`       |   ✓   |   ✓    |   —   |
| `comment:read-all`      |   ✓   |   ✓    |   ✓   |
| `comment:read-private`  |   ✓   |   ✓    |   —   |
| `comment:moderate`      |   ✓   |   —    |   —   |
| `link:read-all`         |   ✓   |   ✓    |   ✓   |
| `link:create`           |   ✓   |   —    |   —   |
| `link:delete`           |   ✓   |   —    |   —   |
| `link:update`           |   ✓   |   —    |   —   |
| `media:read-all`        |   ✓   |   ✓    |   ✓   |
| `media:upload`          |   ✓   |   ✓    |   —   |
| `media:delete`          |   ✓   |   ✓    |   —   |
| `media:manage-uploads`  |   ✓   |   —    |   —   |
| `menu:read-all`         |   ✓   |   ✓    |   ✓   |
| `menu:update`           |   ✓   |   ✓    |   —   |
| `page:read-all`         |   ✓   |   ✓    |   ✓   |
| `page:read-unpublished` |   ✓   |   ✓    |   —   |
| `page:create`           |   ✓   |   ✓    |   —   |
| `page:delete`           |   ✓   |   ✓    |   —   |
| `page:update`           |   ✓   |   ✓    |   —   |
| `post:read-all`         |   ✓   |   ✓    |   ✓   |
| `post:read-unpublished` |   ✓   |   ✓    |   —   |
| `post:create`           |   ✓   |   ✓    |   —   |
| `post:delete`           |   ✓   |   ✓    |   —   |
| `post:update`           |   ✓   |   ✓    |   —   |
| `post:manage-tags`      |   ✓   |   ✓    |   —   |
| `setting:update`        |   ✓   |   —    |   —   |
| `statistics:read`       |   ✓   |   ✓    |   ✓   |
| `tag:create`            |   ✓   |   ✓    |   —   |
| `tag:delete`            |   ✓   |   —    |   —   |
| `tag:update`            |   ✓   |   ✓    |   —   |
| `user:read-self`        |   ✓   |   ✓    |   ✓   |
| `user:read-all`         |   ✓   |   ✓    |   —   |
| `user:manage`           |   ✓   |   —    |   —   |

## 后台演示读取边界

`comment:read-all`、`post:read-all` 和 `page:read-all` 允许进入相应后台列表，不代表可以读取全部敏感数据。GUEST 保留后台演示访问，但读取范围由服务端额外限制。新增的三项能力在登记表中标为 `trpc-data`，用于已通过入口鉴权的 handler 内部数据范围检查，而非替代原有 `trpc` procedure gate：

- `post:read-unpublished` / `page:read-unpublished` 才允许后台列表和详情读取未发布内容。没有该能力时复用 `PUBLISHED_ONLY`，过滤条件不能覆盖发布状态限制，分页与总数只计算可见数据；隐藏详情沿用公开详情的未找到行为。
- `comment:read-private` 才允许返回邮箱、IP、User Agent、父评论及目标关联标识，并允许按这些私有字段筛选或排序。没有该能力时使用显式安全投影，私有筛选或排序请求返回 `FORBIDDEN`。
- 未同时拥有文章和页面未发布读取能力时，评论列表只包含已发布目标的评论（包括 custom 文章引用），在分页及计数前过滤，避免间接暴露未发布标题、关联标识及评论内容。无目标的 custom 评论同样不可见。
- ADMIN 和 EDITOR 继续拥有完整读取范围；匿名请求仍不能调用后台接口。评论管理写权限不变。

## 复合能力

单一能力使用 `permissionProcedure(permission)`。多个能力使用 `permissionsProcedure(permissions, { mode })`：

- `mode: "all"` 要求全部能力；省略 `mode` 时也使用 `all`。
- `mode: "any"` 要求至少一个能力。
- 空 Permission 集不代表公开访问，而是默认拒绝。

## 新增权限流程

1. 在 `src/lib/auth/permissions.ts` 的 `Permission` 中新增稳定的 `resource:action` 业务能力，不使用页面、组件或路由路径命名。
2. 明确 EDITOR 和 GUEST 是否应拥有该能力并更新 `ROLE_PERMISSIONS`；ADMIN 由 `ALL_PERMISSIONS` 自动获得全部能力。
3. 在每个执行该业务动作的服务端 procedure 上声明 Permission，并为允许、拒绝以及 handler 不执行的边界补测试。禁止恢复 `UserLevel` 比较或角色数组 procedure 授权。
4. 仅在需要改善体验时，用共享 `can` / `useCan` 将同一 Permission 绑定到后台导航或操作按钮；前端检查不能替代第 3 步。
5. 更新本矩阵，并运行角色快照、procedure 矩阵、静态授权门禁、类型检查、Lint、全量单测、生产构建及管理后台 E2E。
