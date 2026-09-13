## MODIFIED Requirements

### Requirement: Feature 模块必须具有单一职责边界

每个业务 feature MUST 明确区分领域规则、应用用例、外部适配、传输适配和展示代码；不需要某层时不得创建空目录或无消费者 barrel。feature 之间以及 App 组合层消费 feature 公共 UI 时 MUST 通过最小公开契约或 Application 边界交互，公开出口不得额外暴露只供 feature 内部使用的 hook 或基础设施实现。

#### Scenario: 业务模块访问其他模块

- **WHEN** 一个 feature 需要使用另一个 feature 的能力
- **THEN** 它 MUST 通过对方的公开契约或稳定查询接口访问，且不得导入对方的 admin、infrastructure 或内部 router 文件

#### Scenario: App 组合层使用公共评论或文章 UI

- **WHEN** 博客路由组合 Comment 或 Post 的公共组件
- **THEN** 它 MUST 从对应 feature 的 `public` 出口具名导入，不得绕过出口深层导入组件或查询 hook

#### Scenario: 简单 CRUD 模块

- **WHEN** 一个 feature 不包含复杂聚合规则或某个目录出口没有消费者
- **THEN** 它 MUST 使用轻量用例和 repository 结构，不得为了模板完整性创建空领域层或无职责再导出文件
