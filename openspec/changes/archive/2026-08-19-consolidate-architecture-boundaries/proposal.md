## 为什么

当前工程已经完成 feature-first 和技术包分层，但部分 application 模块仍直接依赖 Drizzle，导致业务用例与数据库模型耦合；同时权限声明分散在 tRPC、Admin Action、路由和菜单入口，存在规则正确但入口遗漏的风险。现在统一边界，可以在业务继续扩展前消化架构复杂度，降低迁移、测试和权限审计成本。

## 变更内容

- 为业务 feature 建立以业务需求为中心的持久化端口，Drizzle 查询下沉到 feature infrastructure adapter。
- 禁止 `features/*/application` 直接导入数据库实例、schema 和 Drizzle 查询工具。
- 明确 `features` 与 `packages` 的职责边界，并用 AST 测试持续阻止反向依赖和灰色入口。
- 建立统一 capability registry，作为 tRPC、Admin Action、Admin route 和菜单能力声明的唯一事实源。
- 校验每个受保护的生产入口均绑定已注册 capability，且不存在未注册或重复声明。
- 保持现有数据库 schema、公开路由、tRPC procedure 名称、权限语义和错误码不变。

## 能力范围

### 新增能力

- `feature-persistence-boundaries`: 约束业务应用层通过窄接口访问持久化能力。
- `capability-entrypoint-registry`: 统一并校验权限能力及其生产入口绑定关系。

### 修改能力

- `capability-authorization`: 增加生产入口必须由统一 capability registry 校验的要求。
- `package-boundaries`: 增加 feature application 与基础设施数据库实现之间的依赖限制。

## 影响范围

- 影响 `src/features/*/application`、feature infrastructure adapter、`src/packages/infrastructure/db`、`src/packages/identity/auth`、tRPC router、Admin Action、菜单和路由权限检查。
- 增加 Vitest/TypeScript AST 边界测试和 capability 一致性测试。
- 不新增运行时依赖，不改变数据库结构和外部 API。
