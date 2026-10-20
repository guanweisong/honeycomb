# 架构边界

## 调用路径

- Client 通过 feature router 调用 server 函数；server 函数直接使用 db 与技术适配器。
- Server Component 可直接调用 feature server 的读取函数。共享缓存只缓存允许公开的数据；写入不在可缓存渲染阶段执行。
- Router 保留输入、会话、入口 capability、限流与协议错误映射。业务规则、事务、并发保护和副作用顺序由 server 函数负责，不复制到 UI 或页面。
- 纯业务 rules 按需抽取为可直接测试的函数，不依赖数据库或框架；不需要额外聚合、端口或用例层。

## 依赖方向

- app 是框架组合根，可组合 feature 的 router、server、admin 与 public 入口。
- feature 不运行时依赖 app。跨 feature 可直接使用稳定纯 schema/type/catalog、有意复用的 UI 或 server 操作具体入口；不能耦合其他 feature router，也不能穿透纯模块或浏览器的运行时边界。admin/components/server 目录名本身不是禁用理由，不要求新增 public barrel。
- components 是通用 UI/编辑器，通过 props、回调或 provider 注入业务能力；不反向导入 app 或 feature 运行时。
- lib 负责 db/auth/trpc/cache/storage/observability/i18n 等技术能力；业务专属类型、状态、选项归所属 feature。
- lib/db 与 lib/auth 可以引用 feature 纯 catalog/schema/type；该依赖链不得加载业务 server、UI、通知或根 router。
- app/_trpc/router.ts 组合业务 router，app/_trpc/server.ts 提供服务端 caller。lib/trpc 不组合业务 router；客户端仅允许 type-only 引用根 AppRouter。
- 浏览器不得传递加载数据库、服务端认证、环境 secret 或 Node-only SDK；Edge 不得加载 Node-only 实现。server-only 边界与递归依赖检查必须保持。

## 复杂度控制

不再使用 src/packages、人工 application/domain/infrastructure 层或 features/contracts。server.ts 与 server/ 均可，按职责和规模决定。数据库访问不需要必经 Repository/factory；只有独立校验、授权、事务、映射、缓存或真实外部适配才保留单独函数。

稳定输出模型与纯输入 schema 不依赖 ORM；server 内可以使用 Drizzle。字段形状相同不代表需要多个模型，类型裁剪也不等于运行时脱敏。共享抽象必须有稳定的真实消费者，不能为减少文件而抹平语义区别。

例如 post 可直接复用 user/admin/use-current-user、category/admin/category-title 与 media/components/PhotoPicker。业务 UI 留在所属 feature，不因跨 feature 复用就移动到通用 components；server 操作只能由服务端消费者使用。

## 认证框架组合例外

现有 `lib/trpc/context.ts` 为读取会话而延迟导入 `src/auth.ts` 是窄技术集成例外；`src/auth.ts` 绑定 Better Auth，认证 hook 与登录审计的框架组合位于 `app/_auth`。该例外不允许 lib/auth 运行时导入 feature 操作，也不允许 lib/trpc 组合业务 router。
