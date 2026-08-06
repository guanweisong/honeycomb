## ADDED Requirements

### Requirement: 环境变量按暴露范围分类
系统 SHALL 使用类型化 Schema 分离服务端核心变量、公开客户端变量和可选集成变量，客户端 MUST NOT 访问未显式公开的服务端变量。

#### Scenario: 客户端读取公开配置
- **WHEN** Client Component 需要站点或第三方公开配置
- **THEN** 它只能从经过校验的客户端配置对象读取 `NEXT_PUBLIC_*` 字段

### Requirement: 生产启动校验核心配置
系统 MUST 在生产服务接收请求前校验站点 URL、Turso 和 Auth 核心配置。

#### Scenario: 核心变量缺失
- **WHEN** 生产实例启动且任一核心变量缺失或格式非法
- **THEN** 启动失败并仅报告变量名与校验原因

#### Scenario: 核心变量有效
- **WHEN** 所有核心变量满足 Schema
- **THEN** 启动校验完成且服务可以继续初始化

### Requirement: 可选集成配置保持原子
系统 SHALL 允许未启用的外部集成完全不配置，但启用时 MUST 提供该集成所需的全部变量。

#### Scenario: OAuth 集成部分配置
- **WHEN** 某个 OAuth Provider 只配置 client ID 或 secret
- **THEN** 环境校验失败并指出该 Provider 配置不完整

#### Scenario: 可选集成未启用
- **WHEN** 某可选集成的变量均未提供
- **THEN** 系统将其标记为禁用且不阻止启动

### Requirement: 测试环境可隔离注入配置
系统 SHALL 允许测试注入独立环境对象并避免读取开发者真实秘密。

#### Scenario: 环境 Schema 单元测试
- **WHEN** 测试传入构造的环境变量集合
- **THEN** 校验结果仅由该集合决定且不暴露进程真实变量
