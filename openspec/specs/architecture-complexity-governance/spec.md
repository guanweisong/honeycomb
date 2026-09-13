## Purpose

通过可追踪的复杂度预算和自动化质量门禁持续控制工程架构复杂度，使新增入口、跨层依赖、超长文件与模型泄漏能够在合并前被准确定位。
## Requirements
### Requirement: 架构复杂度必须有可追踪预算

工程 MUST 持续记录 feature 文件规模、业务入口数量、跨 feature 依赖、超长文件、第三方依赖和边界违规，并在 PR 中报告新增或减少的复杂度。已确认没有生产消费者的兼容出口、空壳 barrel 和历史类型声明 MUST 被删除，并由门禁阻止重新引入。

#### Scenario: 复杂度回归

- **WHEN** 变更新增未经登记的入口、跨层依赖、已淘汰的死出口或超过预算的文件
- **THEN** 质量门禁 MUST 失败并输出具体指标和修复位置

#### Scenario: 复杂度下降

- **WHEN** 删除重复 wrapper、依赖、导出或共享模块
- **THEN** 复杂度报告 MUST 反映删除结果，且相关行为和边界测试 MUST 保持通过

#### Scenario: 框架约定入口

- **WHEN** 静态未使用扫描发现 Next.js、next-intl、Serwist、CSS 或测试夹具入口没有普通 TypeScript 入边
- **THEN** 门禁 MUST 根据显式配置识别这些入口，不得将其作为死代码自动删除

### Requirement: 结构规则必须由自动化测试强制

依赖方向、Server/Client 边界、模型泄漏、权限入口覆盖和未使用依赖检查 MUST 纳入持续集成，而不能只依赖文档审查。

#### Scenario: 本地检查与 CI 一致

- **WHEN** 开发者运行质量检查命令
- **THEN** 本地检查 MUST 覆盖与 CI 相同的架构核心规则，并提供可定位的失败信息

### Requirement: 测试专用契约必须位于测试目录

仅供测试使用的权限矩阵、专用类型和 schema 适配 MUST 位于 `tests`，不得作为生产源码保存在 `src`。架构门禁 MUST 阻止已确认的 test-only 模块重新出现。

#### Scenario: 权限矩阵只服务于测试

- **WHEN** 权限 UI 检查矩阵只被测试读取
- **THEN** 矩阵数据及其专用类型 MUST 位于 `tests`，并继续覆盖真实路由和组件

#### Scenario: 测试专用 schema 适配回归

- **WHEN** schema 包装没有生产消费者且只被测试引用
- **THEN** 该包装 MUST NOT 保留在 `src`，测试 MUST 直接验证所属模块的权威 schema

### Requirement: Feature 写入 schema 消费者必须引用权威定义

Feature 内部消费者 MUST 直接引用所属 Application 的权威写入 schema；仅重新导出同一 schema 的中间文件 MUST NOT 保留。实际定义不同查询或输入规则的 schema 文件 MAY 保留在其现有模块中。

#### Scenario: Feature 消费者使用写入 schema

- **WHEN** Feature 路由、组件或测试需要其写入 schema
- **THEN** 消费者 MUST 从所属 Feature 的 `application/write-schema` 导入，且不得依赖纯转发的 `schemas` 文件

#### Scenario: 语义不同的模型同名

- **WHEN** 不同边界存在字段或用途不同的同名模型
- **THEN** 清理 MUST 保留各自的契约，不得仅为减少名称重复而合并

### Requirement: 门禁必须识别替代命名的边界违规
架构门禁 MUST 按契约职责识别 Feature 根目录的 Repository 和业务端口，不得只禁止名为 `repository.ts` 的单一文件名。

#### Scenario: 根目录新增 ports 文件
- **WHEN** Feature 根目录新增 `ports.ts`、`*-port.ts` 或声明业务 Repository 端口的生产文件
- **THEN** 架构测试失败并报告具体 Feature 和文件

### Requirement: 门禁必须阻止已淘汰运行时资产与死抽象
架构门禁 SHALL 拒绝重新引入旧 Service Worker/Workbox 公共资产，以及没有生产消费者的通用事件基础设施。

#### Scenario: 重新提交遗留 PWA 文件
- **WHEN** `public` 出现 `sw.js`、对应 source map 或 `workbox-*`
- **THEN** 质量门禁失败并指向应使用的 Serwist 入口

#### Scenario: 重新新增未接线事件总线
- **WHEN** 生产源码新增通用事件总线但没有生产创建、注册和消费路径
- **THEN** 架构审查与门禁拒绝该无职责抽象
