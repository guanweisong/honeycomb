## ADDED Requirements

### Requirement: 服务端模块具有编译期边界
系统 MUST 在数据库、认证、tRPC 服务端运行入口、服务端环境配置和外部服务集成入口引入 `server-only`，防止其进入客户端模块图。

#### Scenario: Client Component 导入服务端模块
- **WHEN** Client Component 直接或间接导入受保护的服务端入口
- **THEN** 类型检查或生产构建失败并指出服务端边界违规

#### Scenario: 服务端模块正常组合
- **WHEN** Server Component、Route Handler、Proxy 或服务端 tRPC caller 导入受保护入口
- **THEN** 模块可正常执行且不进入客户端 bundle

### Requirement: 可共享契约保持独立
系统 SHALL 将纯类型、枚举、输入 Schema 和无服务端副作用的工具保留为可共享模块，且 MUST NOT 为绕过错误依赖而移除服务端边界。

#### Scenario: 客户端使用共享类型
- **WHEN** Client Component 导入 API 类型或业务枚举
- **THEN** 导入不触发数据库、秘密或其他服务端运行时代码
