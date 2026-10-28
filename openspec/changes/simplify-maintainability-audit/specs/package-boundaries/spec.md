## MODIFIED Requirements

### Requirement: 底层模块不得依赖传输层

底层模块 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)；重构 MUST 保持现有外部输入输出契约而不保留无职责兼容出口。

#### Scenario: 加载数据库或认证模块

- **WHEN** 测试或服务端运行时导入 DB、Auth 或领域契约
- **THEN** 模块 MUST NOT 加载 `app/_trpc/router.ts`、App Route Handler、客户端页面或 feature server 操作

#### Scenario: 复用用户纯契约

- **WHEN** 数据库或认证需要用户等级或状态
- **THEN** 它们 MUST 直接复用 user feature 拥有的纯目录，不加载业务操作或保留 tRPC 兼容出口

#### Scenario: DB 解析国际化字段

- **WHEN** DB 自定义字段解析持久化的 I18n 值
- **THEN** DB 使用 lib/i18n 中的稳定 I18n 契约，不导入 tRPC Schema

#### Scenario: 违规依赖使用多行导入

- **WHEN** DB、Auth 或 UI 通过多行 import declaration 导入禁止的上层模块
- **THEN** 边界测试仍能识别完整模块路径并失败

### Requirement: Route Handler 保持薄适配层

系统 SHALL 让 App Router Route Handler 只处理 HTTP 输入输出、会话认证和服务调用，数据库查询 MUST 位于所属 feature server 或技术数据库适配器；认证框架绑定与技术例外 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)。

#### Scenario: 处理 Better Auth 请求

- **WHEN** GET 或 POST 请求进入 Better Auth catch-all route
- **THEN** Route Handler SHALL 委托 app/_auth 的认证请求审计 handler 执行，保持原 Better Auth Response 及登录历史行为

#### Scenario: 查询登录历史

- **WHEN** 已登录用户请求登录历史
- **THEN** `accountSecurity.loginHistory` tRPC procedure SHALL 委托所属 Feature 服务，仅查询当前用户并返回安全 DTO，不通过旧登录历史 Route Handler 暴露数据

### Requirement: 通用 UI 不依赖具体 App feature

通用 UI SHALL 通过显式接口接收页面特有能力，其运行时方向 MUST 遵守[依赖方向权威矩阵](../package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)。

#### Scenario: 富文本选择媒体

- **WHEN** Page 或 Post 编辑器点击图片选择按钮
- **THEN** 后台 feature 注入的图片选择器打开并将所选 URL 返回给 Tiptap；当前不提供视频上传或视频选择入口

#### Scenario: 独立加载通用组件

- **WHEN** 测试或其他页面导入 Tiptap 与 DynamicForm
- **THEN** UI 模块不会加载后台路由或后台页面组件
