## 背景

当前工程采用 `app → features → packages` 的总体结构，但部分 `features/*/application` 仍直接导入 Drizzle 的数据库实例、schema 和查询工具。这样虽然保留了目录上的分层，实际上仍把业务用例绑定到具体持久化实现。

权限方面，Permission 常量、tRPC procedure、Admin Action guard、菜单能力和页面入口分别维护声明。现有矩阵测试能够发现一部分不一致，但矩阵本身仍是额外的手工事实源。

本次改造必须保持数据库 schema、路由、tRPC procedure、错误码和权限语义不变，并且不能通过增加无行为的包装层制造虚假隔离。

## 目标与非目标

**目标：**

- 让 application 依赖业务端口，而不是 Drizzle 实现。
- 将数据库查询和第三方存储适配器放到 feature infrastructure 或共享 infrastructure 边界。
- 建立 capability registry，统一描述权限及其生产入口。
- 用静态测试阻止新的越界依赖和遗漏授权入口。
- 保留现有调用契约，允许按业务批次迁移。

**非目标：**

- 不重写数据库 schema 或迁移系统。
- 不改变公开页面、Admin URL、tRPC procedure 名称或权限判定结果。
- 不把所有共享基础设施复制到每个 feature。
- 不为了降低文件行数而拆分没有独立职责的模块。

## 设计决策

### 1. 使用业务端口，而不是通用仓储

每个需要持久化能力的 feature 定义最小接口，例如媒体仓储、文章读取器或用户管理仓储。接口只暴露 application 真正需要的输入和视图模型，不暴露 Drizzle schema、查询构造器或通用 `findMany`。

采用业务端口而不是一个全局通用 Repository，是为了避免把数据库 API 原样重新包装一层。Drizzle 适配器位于 `features/<name>/infrastructure`，共享的数据库连接、事务和观测能力仍位于 `src/packages/infrastructure`。

### 2. 使用默认依赖工厂保持现有调用方式

application 用例接收端口依赖；在 transport、Server Action 或 Server Component 入口使用 feature 的默认工厂注入 Drizzle adapter。测试直接注入 fake port，不再 mock Drizzle 模块作为主要行为验证手段。

这样可以渐进迁移，且不会改变外部调用方。迁移完成后，application 文件中不得出现数据库实现导入。

### 3. 能力注册表作为唯一声明源

registry 使用 `Permission` 作为键，保存能力名称、受保护入口类型和稳定标识。tRPC、Admin Action、Admin route 和菜单声明只能引用 registry 中的 capability；现有矩阵测试改为验证注册表与实际入口的完整映射，而不是维护第二套权限列表。

选择注册表而不是运行时动态扫描，是因为类型检查和 AST 测试能够在构建前发现拼写错误、未注册能力、重复入口和漏保护入口，同时不增加运行时复杂度。

### 4. 边界测试采用 TypeScript AST

边界测试扫描生产源码，禁止 application 导入数据库连接、schema、query helper 和 Drizzle 包；允许 infrastructure adapter 导入这些实现。测试同时检查跨 feature 内部依赖和 capability 入口声明。

## 风险与取舍

- [迁移范围较大] → 按 media、tag、user、content 业务批次迁移，每批保留行为测试并运行全量边界测试。
- [端口设计过度抽象] → 接口只从现有用例调用点反推，不提前设计通用 CRUD API。
- [注册表与既有矩阵短期并存] → 先让矩阵由 registry 驱动，确认无重复事实源后删除手工 permission 列表。
- [测试 fake 与生产 adapter 行为不一致] → adapter 增加集成边界测试，application 测试只验证业务规则和端口调用契约。
- [遗漏历史入口] → AST 扫描覆盖 `src/app`、`src/features` 和 `src/packages/trpc` 的生产文件，并把所有受保护入口纳入 CI。

## 迁移计划

1. 先增加中文 OpenSpec 规格和失败的边界测试。
2. 建立 capability registry，并将现有 tRPC、Admin Action、菜单和矩阵迁移到 registry。
3. 为 media、tag、user 建立业务端口和 adapter，验证模式。
4. 按 comment、post、page、menu、link、category、setting 批量迁移剩余 application 模块。
5. 删除 application 中的数据库实现导入和重复权限来源。
6. 执行类型检查、Lint、全量单测、覆盖率、process 测试、生产构建和可用的 Playwright 回归。

回滚策略是按批次回滚 feature adapter 与 application 注入改动；数据库 schema、外部 API 和权限数据无需回滚。

## 待确认事项

- 当前没有需要用户决策的开放问题；若某个 feature 的事务边界无法通过端口表达，应暂停该批次并更新本设计，而不是退回直接导入 Drizzle。
