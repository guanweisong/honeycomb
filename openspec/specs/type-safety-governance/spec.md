## Purpose

建立覆盖跨层 DTO、类型断言、可空数据和测试替身的持续类型安全治理，以自动化门禁阻止不安全类型逃逸重新进入 Application 与生产代码。

## Requirements

### Requirement: Application Repository 契约禁止显式 any

系统 SHALL 使生产代码中的 Application Repository 类型和接口不包含显式 `any`，也不得通过关闭 `@typescript-eslint/no-explicit-any` 规避该要求。

#### Scenario: 新增或修改 Application Repository 契约

- **WHEN** 开发者新增或修改 `src/features/*/application` 中的 Repository 契约
- **THEN** 自动化治理测试必须拒绝显式 `any` 和对应 ESLint 抑制

### Requirement: 跨层 DTO 必须表达稳定字段

系统 MUST 由 Application 层拥有跨层 Repository DTO，并显式描述用例所需字段；Application DTO 不得依赖 Drizzle schema 或 tRPC procedure output。

#### Scenario: Infrastructure 实现 Application Repository

- **WHEN** Infrastructure adapter 读写持久化模型
- **THEN** adapter 必须在持久化边界完成 Application DTO 与 Drizzle 类型之间的映射

#### Scenario: Transport 调用 Application Use Case

- **WHEN** tRPC、Server Action 或其他 Transport 入口调用 Application Use Case
- **THEN** Application 契约必须能够脱离该 Transport 的 Zod schema 或 procedure output 独立完成类型检查

### Requirement: 可明确建模的断言必须被消除

系统 SHALL 使用准确源类型、控制流窄化、类型谓词、判别联合、`satisfies` 或显式缺失值处理，替代能够明确建模的普通断言、双重断言和非空断言。

#### Scenario: 可选值允许缺失

- **WHEN** 生产代码读取一个可能缺失且业务允许缺失的值
- **THEN** 代码必须显式处理 fallback 或提前返回，不得仅使用非空断言跳过检查

#### Scenario: 缺失值违反不变量

- **WHEN** 生产代码确认某值缺失代表领域或应用不变量被破坏
- **THEN** 代码必须通过已测试的错误分支建立运行时保证，再继续使用已窄化的值

### Requirement: 合理断言必须保持局部且可解释

系统 MAY 保留用于字面量窄化、已校验品牌类型构造或无法由上游公开类型表达的第三方适配断言，但非显然断言 MUST 保持在最小边界并附带具体原因。

#### Scenario: 第三方库缺少公开类型

- **WHEN** 测试或适配器必须访问第三方库未公开但稳定使用的结构
- **THEN** 代码必须先经过 `unknown` 边界映射到最小结构，且不得引入显式 `any`

#### Scenario: 使用字面量窄化

- **WHEN** 代码使用 `as const` 保留只读字面量类型
- **THEN** 治理门禁不得把该用法识别为类型逃逸

### Requirement: 测试替身必须反映真实契约

测试代码 SHALL 优先使用类型化 fixture、结构化 fake、接口子集或 `satisfies`，替代能够清理的 `as never`、双重断言和非空断言。

#### Scenario: 为 Use Case 构造 Repository fake

- **WHEN** 测试只需要 Repository 接口的一部分行为
- **THEN** fake 必须通过明确的接口子集或工厂表达所需方法，使接口变化能够触发类型错误

#### Scenario: 测试要求 DOM 节点存在

- **WHEN** 测试后续步骤要求查询到的 DOM 节点必然存在
- **THEN** 测试必须通过显式存在性检查或可复用测试辅助函数建立保证，并在缺失时输出可诊断错误

### Requirement: 同一语义契约必须具有唯一事实源

系统 SHALL 让同一读取模型的运行时 schema 与静态类型共享定义；contracts 仅重新导出所属 Feature 的模型，不独立重建。不同语义模型 SHALL 明确命名。

#### Scenario: 复用媒体与标签读取模型

- **WHEN** 文章、页面或缓存需要完整媒体/标签数据
- **THEN** 通过所属模块公开 Application 契约复用，不重新手写完整字段集合

#### Scenario: 区分评论响应

- **WHEN** 消费者引用公开或后台评论模型
- **THEN** 使用明确不同的名称，不出现同名但含义不同的 CommentViewModel

#### Scenario: 写入契约及配置目录复用

- **WHEN** 写入校验、OAuth 提供商、登录事件、分页参数、语言或缓存 namespace 被多个消费者使用
- **THEN** 同语义定义由所属模块提供，静态类型推导、传输出口重新导出，消费者不得平行维护完整字段或成员清单

#### Scenario: 保留边界默认值与转换语义

- **WHEN** 收敛 API、Repository、UI 的分页策略或评论记录映射
- **THEN** API 默认 updatedAt、Repository 默认 createdAt、UI 每页 20 条保持不变；评论读写及通知复用统一记录映射，同时保留各自关联和公开字段边界

### Requirement: 索引访问必须显式处理缺失

工程 SHALL 对生产代码、脚本和测试启用 noUncheckedIndexedAccess，不得通过非空断言或排除文件规避检查。

#### Scenario: 读取数组或开放字典

- **WHEN** 索引可能不存在
- **THEN** 消费者必须处理 undefined 或通过运行时检查建立存在保证

### Requirement: 持久化边界必须兑现返回契约

Repository SHALL 在返回领域枚举前验证持久化值，并对必需写入结果建立运行时存在保证。

#### Scenario: 写入未返回记录

- **WHEN** 创建或更新未返回契约要求的记录
- **THEN** 操作必须明确失败，不得返回伪装为对象的 undefined

#### Scenario: 存储了未知枚举

- **WHEN** 数据库读取包含不受支持的状态或类型
- **THEN** adapter 必须拒绝该值，不得使用类型断言把它传入领域对象

### Requirement: 外部与表单数据须经真实契约验证

系统 SHALL 从运行时验证后的数据构建提交和跨层模型，不得用业务对象断言或任意目标泛型掩盖不匹配。

#### Scenario: 外部返回畸形 JSON

- **WHEN** 验证接口或缓存返回不符合约定的数据
- **THEN** 系统必须拒绝或按明确的未命中策略处理，不得作为可信 DTO 使用

### Requirement: 类型清理不得改变外部行为

系统 MUST 保持现有 tRPC procedure、有效 Zod 输入协议、成功响应结构、数据库 schema 和迁移不变。非法持久化数据和必需写入结果缺失 MUST 明确失败。

#### Scenario: 完成类型安全治理

- **WHEN** 所有清理任务完成
- **THEN** 类型检查、Lint、全量单元测试、覆盖率门禁和生产构建必须通过
