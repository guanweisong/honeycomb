# 质量门禁

## 可读性与规模

注释解释原因、约束和副作用，不复述代码；公共 API 与复杂规则补充中文 JSDoc。单文件超过约 300 行应评估拆分，超过约 600 行必须拆分或记录例外；测试文件约 500/1000 行同理。不要为满足数字增加无职责 wrapper。

## 测试与验证

按范围运行 bun run check-types、bun run lint、相关单元测试及 git diff --check。架构、共享契约或大范围治理改动必须运行全量单元、进程与覆盖率；涉及构建、路由、认证或端到端行为时运行 build 及对应开发/生产 E2E。未运行或环境阻塞必须单独报告。

覆盖率继续扫描生产 TypeScript/TSX；未被测试导入的业务代码仍进入分母。仅保留 vitest.config.mts 中由 tests/coverage-governance.test.ts 锁定的既有排除：类型声明、测试/夹具、未修改的 shadcn 基础组件，以及由真实离线 E2E 验证的 Service Worker 入口；后者的 E2E 未运行时必须明确标为未验证。不得新增业务排除项或降低阈值：全局至少 statements/lines 70%、functions 65%、branches 60%；权限、环境、脱敏、sitemap、缓存和观测核心继续执行 statements/lines 90%、branches 80% 的增强要求。路径迁移同步配置，不借机缩小库存。

CI 必须自动检查：

- src/packages、人工 feature 分层和中央 contracts 不再出现；只转发的业务入口不得回归。
- feature 不反向依赖 app，也不耦合另一 feature router；有意复用的 feature UI/操作允许通过具体入口直接引用，不要求 public 转发。纯模块和浏览器不得加载服务端实现。
- lib/trpc 无根 router/runtime 业务编排，type-only AppRouter 引用除外；lib/db/auth 对 feature 的纯契约引用不传递加载业务操作。
- 纯 schema/type/rules 不依赖 ORM 或框架；通用 UI 不依赖 app/feature 运行时；浏览器、server-only、Edge 边界不被间接 import 绕过。
- 权限、公开 DTO、数据验证和类型唯一事实源保持测试覆盖。

边界测试从目录动态发现 feature，而不是固定名单。静态边界通过不能替代真实行为测试。CI 保留完整 Chromium 项目库存，隔离数据库先迁移和确定性 seed，关键场景不条件跳过。

## 评审清单

- 调用链是否最短且职责明确，有无无意义 factory、接口或转发？
- server 函数能否直接测试，是否保留事务、分类 SQL 防环与条件写入？
- capability、GUEST 读取范围、公开 DTO 裁剪、发布/账号规则是否仍不可绕过？
- 缓存失败、评论通知和媒体删除不确定结果是否保留原语义？
- schema、类型、规则、状态和默认值是否仍各有唯一权威来源？
- 共享组件、浏览器/服务端/Edge、草稿恢复与 Sentry 隐私是否得到回归验证？
- 是否清理所有旧路径并同步 OpenSpec、README、技能和真实验证结果？
