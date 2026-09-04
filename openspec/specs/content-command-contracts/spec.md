## Purpose

确保 Post 和 Page 的跨层命令使用精确、框架无关的字段类型和领域枚举，并由显式 mapper 安全转换为持久化值，防止宽泛类型掩盖协议错误。

## Requirements

### Requirement: 内容命令使用真实 Application DTO

Post 和 Page 的 Application 命令契约 MUST 使用明确字段类型、可空性和领域枚举，不得使用 `unknown`、开放式记录或裸字符串掩盖已经验证的业务数据。

#### Scenario: 创建文章命令

- **WHEN** tRPC 的文章创建输入通过 Zod 校验
- **THEN** 其输出类型 SHALL 可直接传递给 `PostCreateCommand`，无需类型断言

#### Scenario: 更新页面命令

- **WHEN** tRPC 的页面更新输入通过 Zod 校验
- **THEN** 其输出类型 SHALL 可直接传递给 `PageUpdateCommand`，无需类型断言

### Requirement: 持久化映射显式且受编译器验证

Post 和 Page 的 Infrastructure mapper MUST 逐字段构造 Drizzle 写入值，并使用真实类型检查代替整体 ORM 模型断言。

#### Scenario: 映射文章内容

- **WHEN** Post 命令被转换为持久化值
- **THEN** mapper SHALL 规范化多语言字段、清洗富文本并仅输出允许的数据库字段

#### Scenario: 映射页面内容

- **WHEN** Page 命令被转换为持久化值
- **THEN** mapper SHALL 清洗多语言内容并保留未提供字段的更新语义

### Requirement: 类型治理阻止契约回退

项目 MUST 自动检查内容 Application Command DTO 和 mapper，阻止重新引入开放式未知字段或整体 Drizzle 写入断言。

#### Scenario: 引入未知命令字段

- **WHEN** Post 或 Page 命令契约新增 `unknown` 或开放式记录字段
- **THEN** 类型治理测试 MUST 失败

#### Scenario: 恢复整体 ORM 断言

- **WHEN** 内容 mapper 使用整体 `as InferInsertModel` 掩盖字段不匹配
- **THEN** 类型治理测试 MUST 失败
