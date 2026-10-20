## ADDED Requirements

### Requirement: 内容命令使用真实 Feature DTO

Post 和 Page 的 Feature 命令契约 MUST 使用明确字段类型、可空性和领域枚举，不得使用 `unknown`、开放式记录或裸字符串掩盖已经验证的业务数据。

#### Scenario: 创建文章命令

- **WHEN** tRPC 的文章创建输入通过 Zod 校验
- **THEN** 其输出类型 SHALL 可直接传递给 `PostCreateCommand`，无需类型断言

#### Scenario: 更新页面命令

- **WHEN** tRPC 的页面更新输入通过 Zod 校验
- **THEN** 其输出类型 SHALL 可直接传递给 `PageUpdateCommand`，无需类型断言

## MODIFIED Requirements

### Requirement: 持久化映射显式且受编译器验证

Post 和 Page 的 server 持久化 mapper MUST 逐字段构造 Drizzle 写入值，并使用真实类型检查代替整体 ORM 模型断言。

#### Scenario: 映射文章内容

- **WHEN** Post 命令被转换为持久化值
- **THEN** mapper SHALL 规范化多语言字段、清洗富文本并仅输出允许的数据库字段

#### Scenario: 映射页面内容

- **WHEN** Page 命令被转换为持久化值
- **THEN** mapper SHALL 清洗多语言内容并保留未提供字段的更新语义

### Requirement: 类型治理阻止契约回退

项目 MUST 自动检查内容 Feature 命令 DTO 和 mapper，阻止重新引入开放式未知字段或整体 Drizzle 写入断言。

#### Scenario: 引入未知命令字段

- **WHEN** Post 或 Page 命令契约新增 `unknown` 或开放式记录字段
- **THEN** 类型治理测试 MUST 失败

#### Scenario: 恢复整体 ORM 断言

- **WHEN** 内容 mapper 使用整体 `as InferInsertModel` 掩盖字段不匹配
- **THEN** 类型治理测试 MUST 失败

## REMOVED Requirements

### Requirement: 内容命令使用真实 Application DTO

**Reason**: 旧人工层级或出口所有权已被本变更的简单 feature 职责取代，实质业务、安全和类型约束继续保留。

**Migration**: 直接使用所属 feature 的纯契约或有意复用的具名 UI/server 操作入口；根组合迁入 app，通用 UI 迁入 components，技术能力迁入 lib。
