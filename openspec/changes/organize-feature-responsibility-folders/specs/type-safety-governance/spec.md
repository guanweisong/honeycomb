## MODIFIED Requirements

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
