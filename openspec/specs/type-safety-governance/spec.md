## Purpose

建立覆盖跨层 DTO、类型断言、可空数据和测试替身的持续类型安全治理，以自动化门禁阻止不安全类型逃逸重新进入 feature server 与生产代码。

## Requirements

### Requirement: Feature 数据契约禁止显式 any

系统 SHALL 使生产代码中的 Feature 数据契约类型和接口不包含显式 `any`，也不得通过关闭 `@typescript-eslint/no-explicit-any` 规避该要求。

#### Scenario: 新增或修改 Feature 数据契约

- **WHEN** 开发者新增或修改 feature schema、types 或 server 中的数据契约
- **THEN** 自动化治理测试必须拒绝显式 `any` 和对应 ESLint 抑制

### Requirement: 跨层 DTO 必须表达稳定字段

系统 MUST 由所属 feature 拥有稳定输入输出模型，并显式描述业务所需字段；纯契约不得依赖 Drizzle schema 或 tRPC procedure output，server 实现可以直接使用 ORM 类型。

#### Scenario: server 实现持久化读取

- **WHEN** server 函数读写持久化模型
- **THEN** 函数必须在需要裁剪、规范化或转换的持久化边界显式构造稳定结果，不创建无职责 mapper

#### Scenario: Transport 调用 Feature server 操作

- **WHEN** tRPC、Server Action 或其他 Transport 入口调用 Feature server 操作
- **THEN** 输入契约必须直接复用所属 feature 的权威 schema，不依赖 router 实现或 procedure output

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

#### Scenario: 为 server 操作构造真实依赖替身

- **WHEN** 测试只需要数据库或技术接口的一部分行为
- **THEN** 替身必须使用真实签名、typed fixture/mock 或最小接口子集，使接口变化触发类型错误；不为测试另建生产 Repository 层

#### Scenario: 测试要求 DOM 节点存在

- **WHEN** 测试后续步骤要求查询到的 DOM 节点必然存在
- **THEN** 测试必须通过显式存在性检查或可复用测试辅助函数建立保证，并在缺失时输出可诊断错误

### Requirement: 同一语义契约必须具有唯一事实源

系统 SHALL 让同一读取模型的运行时 schema 与静态类型共享定义；消费者直接复用所属 feature 的纯契约，不建立集中 contracts 转发。不同语义模型 SHALL 明确命名。

#### Scenario: 复用媒体与标签读取模型

- **WHEN** 文章、页面或缓存需要完整媒体/标签数据
- **THEN** 通过所属模块纯契约或明确 public 出口复用，不重新手写完整字段集合

#### Scenario: 区分评论响应

- **WHEN** 消费者引用公开或后台评论模型
- **THEN** 使用明确不同的名称，不出现同名但含义不同的 CommentViewModel

#### Scenario: 写入契约及配置目录复用

- **WHEN** 写入校验、OAuth 提供商、登录事件、分页参数、语言或缓存 namespace 被多个消费者使用
- **THEN** 同语义定义由所属模块提供，静态类型推导、传输入口直接引用，消费者不得平行维护完整字段或成员清单

#### Scenario: 保留边界默认值与转换语义

- **WHEN** 收敛 API、持久化读取、UI 的分页策略或评论记录映射
- **THEN** API 默认 updatedAt、持久化读取默认 createdAt、UI 每页 20 条保持不变；评论读写及通知复用统一记录映射，同时保留各自关联和公开字段边界

### Requirement: 设置写入契约必须区分真实语义

Setting feature MUST 拥有后台更新运行时 schema 和内部 nullable patch schema，静态类型 MUST 从对应 schema 推导，transport MUST 直接引用其消费的权威 schema。

#### Scenario: 后台更新设置

- **WHEN** 后台表单或 tRPC 更新 Setting
- **THEN** 输入 MUST 使用 Setting feature 拥有的后台更新 schema，transport 不得重写字段清单

#### Scenario: 内部清空本地化字段

- **WHEN** 内部用例需要把某个本地化 Setting 字段整体设为 `null`
- **THEN** 它 MUST 使用明确命名的内部 patch 契约，不得扩大后台表单协议

### Requirement: 菜单契约不得使用开放索引签名

Menu 保存输入 MUST 从 Menu feature 运行时 schema 推导，Menu 读取模型 MUST 只声明真实字段且不得包含 `[key: string]: unknown`。

#### Scenario: 拼错菜单读取字段

- **WHEN** 消费者访问 Menu 读取模型未声明的字段
- **THEN** TypeScript 类型检查 MUST 失败

### Requirement: 缓存失效端口必须保持唯一

所有 Feature MUST 通过 `PublicContentInvalidator.invalidate(plan)` 表达公开缓存影响，不得平行维护 `invalidateContent`、`invalidateAll` 或同义兼容端口。

#### Scenario: 评论失效公开缓存

- **WHEN** 评论创建、更新或删除影响公开内容
- **THEN** Comment server 操作 MUST 构造权威计划并调用唯一 `invalidate(plan)` 端口

#### Scenario: 扫描兼容入口

- **WHEN** 唯一事实源门禁扫描生产代码
- **THEN** `invalidateContent` 与 `invalidateAll` 同义入口 MUST 不存在

### Requirement: 索引访问必须显式处理缺失

工程 SHALL 对生产代码、脚本和测试启用 noUncheckedIndexedAccess，不得通过非空断言或排除文件规避检查。

#### Scenario: 读取数组或开放字典

- **WHEN** 索引可能不存在
- **THEN** 消费者必须处理 undefined 或通过运行时检查建立存在保证

### Requirement: 持久化边界必须兑现返回契约

server 持久化读取 SHALL 在返回业务枚举前验证持久化值，并对必需写入结果建立运行时存在保证。

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

### Requirement: Feature schema 与静态类型职责分离

Feature 的运行时校验 schema MUST 在 schema 模块定义，不在 schema 模块导出派生业务类型；`types/` 中的派生类型文件 MUST 通过 `import type` 引用权威 schema 并使用 `z.output<typeof Schema>` 推导解析后类型。这些类型文件 MUST 仅包含类型声明和显式类型依赖，不定义或转导出运行时 schema。消费者 MUST 从所属 feature 的权威类型入口导入类型，不保留旧 schema 类型转导出链。

#### Scenario: 保持原始输入与解析后输出的区别

- **WHEN** 迁移包含 transform、default 或 partial 的校验契约
- **THEN** 原有输出类型保持输出语义，既有 `z.input` 原始输入消费者不得机械改成 `z.output`，类型回归必须检查实际输入输出差异

#### Scenario: 保持有意扩展的命令契约

- **WHEN** Category 或 Tag 的内部写入类型在 schema 输出上增加可选 id
- **THEN** 原始校验输出分别命名为 CategoryInsertInput 或 TagInsertInput，既有 CategoryInsert 或 TagInsert 保留可选 id 的独立语义，不合并成同名不同义类型

#### Scenario: 运行时读取模型与纯类型入口分离

- **WHEN** MediaRecordSchema 或 TagRecordSchema 被其他 feature 复用
- **THEN** 运行时 schema 由所属 schema 模块提供，MediaRecord 或 TagRecord 在 types 中推导，schema 初始化表达式与字段校验保持不变

#### Scenario: 避免反向类型依赖与无意义文件拆分

- **WHEN** feature 已有 schema 与 types 入口或嵌套表单 schema
- **THEN** 派生业务类型归入所属 feature 的 types/ 具名文件，schema 不反向依赖派生类型；schema MAY 运行时导入 types/ 中的中立业务 enum/catalog，但 MUST NOT 导入展示 enum。枚举一文件一个，不将 types/ 整目录视为纯 type-only，也不放行 schema 或服务端实现。schema 内部必要但不导出的辅助类型可以保留，不为目录对称新增转发文件
