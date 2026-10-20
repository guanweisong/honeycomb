# 业务功能边界

每个 feature 拥有自己的业务输入、状态、规则、server 操作和 UI。app 负责路由/布局/HTTP/框架组合，components 放通用组件，lib 放共享技术能力。

按实际职责选择入口，不要求补齐全部文件：

- router.ts：tRPC 输入、会话、capability、限流和错误协议。
- schema.ts / types.ts：权威业务输入和稳定模型；其他差异化输入可按需拆分。
- rules.ts 或具名纯文件：可独立测试的不变量、状态和类型目录，不依赖数据库或框架。
- server.ts 或 server/：直接使用 Drizzle 的查询、事务、业务写入与副作用顺序。
- admin / public：所属业务的后台 UI 与明确公开能力。

默认调用是 UI → router → server 函数 → db。不要添加仅转发的 Repository 接口、factory、Use Case 或 handler；不建立 application/domain/infrastructure 层、src/packages 或中央 features/contracts。

根 tRPC 组合与服务端 caller 位于 app/_trpc。lib/trpc 只保留公共 core/context/client 及传输工具；客户端的 AppRouter 引用必须 type-only。lib/db、lib/auth 可复用 feature 拥有的纯 catalog/schema/type，但不能加载业务 server 操作。

跨 feature 可直接引用对方的纯契约、有意复用的 UI 或 server 操作，通过明确具体入口表达依赖，不要求 public 转发层；禁止 router 耦合、反向引用 app、纯模块加载运行时及浏览器加载服务端实现。通用编辑器通过注入使用 media feature 的媒体选择能力。

权限、公开 DTO 实际裁剪、GUEST 数据范围、发布规则、分类 SQL 防环、事务与条件写入、publicSync 降级、评论通知容错、媒体删除不确定结果、草稿恢复以及 browser/server/Edge 和 Sentry 隐私边界均保持不变。路径精简不得削弱测试、覆盖率、数据库安全或类型唯一事实源。

认证框架组合位于 app/_auth；src/auth.ts 是 Better Auth 绑定。lib/trpc/context.ts 保留读取会话所需的窄延迟导入，不允许借此把业务操作放回 lib/auth 或将根 router 组合放回 lib/trpc。
