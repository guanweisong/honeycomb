## ADDED Requirements

### Requirement: 门禁必须阻止重新引入人工分层

架构门禁 MUST 拒绝 src/packages、中央 features/contracts 及 feature application/domain/infrastructure 目录，不得仅凭重命名把无职责 Repository、factory 或 wrapper 当作新设计。

#### Scenario: 恢复旧分层

- **WHEN** 生产源码重新引入旧目录或只转发参数的业务层
- **THEN** 架构门禁或对应调用链回归测试 MUST 失败并定位具体入口

## MODIFIED Requirements

### Requirement: Feature 写入 schema 消费者必须引用权威定义

Feature 内部消费者 MUST 直接引用所属 Feature 的权威写入 schema；仅重新导出同一 schema 的中间文件 MUST NOT 保留。实际定义不同查询或输入规则的 schema 文件 MAY 保留在其现有模块中。

#### Scenario: Feature 消费者使用写入 schema

- **WHEN** Feature 路由、组件或测试需要其写入 schema
- **THEN** 消费者 MUST 从所属 Feature 的 `schema.ts` 导入，且不得依赖纯转发的中间文件

#### Scenario: 语义不同的模型同名

- **WHEN** 不同边界存在字段或用途不同的同名模型
- **THEN** 清理 MUST 保留各自的契约，不得仅为减少名称重复而合并

### Requirement: 门禁必须阻止已淘汰运行时资产与死抽象

架构门禁 SHALL 拒绝重新引入旧 Service Worker/Workbox 公共资产，以及没有生产消费者的通用事件基础设施。

#### Scenario: 重新提交遗留 PWA 文件

- **WHEN** `public` 出现 `sw.js`、对应 source map 或 `workbox-*`
- **THEN** 质量门禁失败并指向应使用的 Serwist 入口

#### Scenario: 重新新增未接线事件总线

- **WHEN** 生产源码新增通用事件总线但没有生产创建、注册和消费路径
- **THEN** 架构审查与门禁拒绝该无职责抽象

### Requirement: Feature 边界门禁必须动态覆盖现有模块

架构边界测试 MUST 从 `src/features` 自动发现业务 Feature，并将每个发现的模块纳入适用的结构和 transport 检查。新增 Feature 不得因未更新测试名单而绕过门禁。

#### Scenario: 仓库新增 Feature 目录

- **WHEN** `src/features` 下新增包含生产代码的 Feature 目录
- **THEN** 该目录 MUST 自动进入跨 Feature 依赖、纯契约/运行时边界及写入入口检查

#### Scenario: 测试夹具包含非法写入口

- **WHEN** Router mutation 未调用本 Feature 的 server 函数
- **THEN** 架构门禁 MUST 报告该 mutation，而不能仅通过检查旧 service 路径是否存在来判断

## REMOVED Requirements

### Requirement: 门禁必须识别替代命名的边界违规

**Reason**: 旧人工层级或出口所有权已被本变更的简单 feature 职责取代，实质业务、安全和类型约束继续保留。

**Migration**: 直接使用所属 feature 的纯契约或有意复用的具名 UI/server 操作入口；根组合迁入 app，通用 UI 迁入 components，技术能力迁入 lib。
