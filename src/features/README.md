# 业务功能边界

每个 feature 拥有自己的业务输入、状态、规则和 server 操作；浏览器页面、组件、交互 hooks 与展示配置归 `src/app`，通用 UI/编辑器归 `src/components`，共享技术能力归 `src/lib`。

按实际职责选择入口，不要求补齐全部文件：

- router.ts：tRPC 输入、会话、capability、限流和错误协议。
- schemas/ / types/：按职责命名的权威业务输入和稳定模型，如 tag.insert.schema.ts / tag.insert.ts；每个 enum 独立一个文件，纯 DTO 仍只能 type-only 依赖。
- rules/：按职责具名的纯不变量和状态规则，不依赖数据库或框架。
- server/：直接使用 Drizzle 的查询、事务、业务写入与副作用顺序。

展示名称和组件枚举也归所属 types/，但不是业务 catalog，schemas/、rules、DB 不得依赖它们；后台选项数组与展示映射归对应 app 路由。不保留根 types.ts/schema.ts/server.ts/rules.ts 或兼容 barrel，也不为 dashboard 等无契约需要的模块补空目录。

默认调用是 app UI → router → feature server 函数 → db。不要添加仅转发的 Repository 接口、factory、Use Case 或 handler；不建立 application/domain/infrastructure 层、src/packages 或中央 features/contracts。

根 tRPC 组合与服务端 caller 位于 app/trpc。lib/trpc 只保留公共 core/context/client 及传输工具；客户端的 AppRouter 引用必须 type-only。lib/db、lib/auth 可复用 feature 拥有的纯 catalog/schema/type，但不能加载业务 server 操作。

跨 feature 可直接引用对方的纯契约或 server 操作，通过明确具体入口表达依赖，不要求 public 转发层；feature 不得存放浏览器 UI 或反向引用 app。禁止 router 耦合、纯模块加载运行时及浏览器加载服务端实现。通用编辑器通过 app 侧注入媒体选择 UI。

权限、公开 DTO 实际裁剪、GUEST 数据范围、发布规则、分类 SQL 防环、事务与条件写入、publicSync 降级、评论通知容错、媒体删除不确定结果、草稿恢复以及 browser/server/Edge 和 Sentry 隐私边界均保持不变。路径精简不得削弱测试、覆盖率、数据库安全或类型唯一事实源。

认证框架组合位于 app/auth；src/auth.ts 是 Better Auth 绑定。lib/trpc/context.ts 保留读取会话所需的窄延迟导入，不允许借此把业务操作放回 lib/auth 或将根 router 组合放回 lib/trpc。
