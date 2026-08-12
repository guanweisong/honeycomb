# Package Boundaries

## Purpose

约束领域、数据库、认证等底层模块、App Router Route Handler 与通用 UI 的依赖方向，防止传输层和页面层发生反向耦合。

## Requirements

### Requirement: 底层模块不得依赖传输层

系统 SHALL 让领域契约、数据库和认证模块独立于 tRPC 与 App Router 传输实现，并 MUST 为现有调用路径保留兼容契约。

#### Scenario: 加载数据库或认证模块

- **WHEN** 测试或服务端运行时导入 DB、Auth 或领域契约
- **THEN** 模块不会加载 `packages/trpc/api`、App Route Handler 或客户端页面实现

#### Scenario: 使用原有用户类型路径

- **WHEN** 现有调用方仍从 tRPC 用户类型文件导入用户等级或状态
- **THEN** 兼容导出返回与领域契约相同的枚举和值

#### Scenario: DB 解析国际化字段

- **WHEN** DB 自定义字段解析持久化的 I18n 值
- **THEN** DB 使用 Domain 中的稳定 I18n 契约，不导入 tRPC Schema

#### Scenario: 违规依赖使用多行导入

- **WHEN** DB、Auth 或 UI 通过多行 import declaration 导入禁止的上层模块
- **THEN** 边界测试仍能识别完整模块路径并失败

### Requirement: Route Handler 保持薄适配层

系统 SHALL 让 App Router Route Handler 只处理 HTTP 输入输出、会话认证和服务调用，数据库查询与认证审计编排 MUST 位于服务端领域模块。

#### Scenario: 处理 Better Auth 请求

- **WHEN** GET 或 POST 请求进入 Better Auth catch-all route
- **THEN** Route Handler 委托认证审计 handler 执行且保持原 Better Auth Response

#### Scenario: 查询登录历史

- **WHEN** 已登录用户请求登录历史
- **THEN** Route Handler 调用仅查询当前用户的服务并返回原有安全 DTO

### Requirement: 请求元数据与限流解耦

系统 SHALL 使用无环境副作用的 HTTP 模块解析客户端 IP，并 MUST 让认证审计与限流复用相同解析规则。

#### Scenario: Auth 读取客户端 IP

- **WHEN** 登录历史从请求中提取 IP
- **THEN** 系统不会初始化 Upstash、读取限流配置或加载 tRPC 模块

#### Scenario: 代理请求包含客户端 IP

- **WHEN** 请求包含受支持的代理 IP header
- **THEN** Auth 与 middleware 获得一致的规范化客户端 IP

### Requirement: 共享与服务端认证模块隔离

系统 SHALL 将 OAuth provider 公共类型和标签与服务端环境读取分离，并 MUST 防止客户端模块导入 `server-only` 实现。

#### Scenario: 客户端渲染关联账号

- **WHEN** 关联账号组件导入 provider id 和标签
- **THEN** 客户端 bundle 不包含服务端环境解析代码或 OAuth secret

### Requirement: 通用 UI 不依赖具体 App feature

系统 SHALL 让通用 UI 通过显式接口接收页面特有能力，并 MUST NOT 从 `packages/ui` 导入 `src/app` 模块。

#### Scenario: 富文本选择媒体

- **WHEN** Page 或 Post 编辑器点击图片或视频选择按钮
- **THEN** 后台 feature 注入的媒体选择器打开并将所选 URL 返回给 Tiptap

#### Scenario: 独立加载 UI 包

- **WHEN** 测试或其他页面导入 Tiptap 与 DynamicForm
- **THEN** UI 模块不会加载后台路由或后台页面组件

### Requirement: 重构保持外部行为

系统 MUST 保持现有 URL、Better Auth 登录与审计结果、tRPC procedure、数据库结构、权限结果和页面交互不变。

#### Scenario: 执行回归验证

- **WHEN** 运行认证、账号安全、富文本、类型检查、Lint 和生产构建验证
- **THEN** 所有既有契约通过且依赖边界测试不发现反向依赖
