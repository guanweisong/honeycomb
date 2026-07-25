## ADDED Requirements

### Requirement: 响应使用集中式 CSP
系统 SHALL 为应用响应生成集中式 Content Security Policy，并按已启用的资源域、Analytics 和 Turnstile 配置最小允许列表。

#### Scenario: 生产 CSP 强制模式
- **WHEN** 生产环境关闭观察模式
- **THEN** 响应包含 `Content-Security-Policy` 且未授权来源被浏览器阻止

#### Scenario: CSP 观察模式
- **WHEN** 生产环境启用观察模式
- **THEN** 响应包含 `Content-Security-Policy-Report-Only` 且不同时发送冲突的强制策略

#### Scenario: 开发环境热更新
- **WHEN** 应用运行在开发环境
- **THEN** CSP 仅增加 Next.js 开发所需来源，不放宽生产策略

### Requirement: 响应包含通用安全头
系统 MUST 设置内容类型保护、来源策略、浏览器能力限制和防嵌入策略，并 SHALL 仅在 HTTPS 生产环境启用 HSTS。

#### Scenario: 普通应用响应
- **WHEN** 客户端请求任意应用路由
- **THEN** 响应包含 `X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 和禁止非授权嵌入的策略

#### Scenario: HTTPS 生产响应
- **WHEN** 应用在 HTTPS 生产环境返回响应
- **THEN** 响应包含具有明确有效期和子域策略的 HSTS

### Requirement: 安全策略兼容核心功能
系统 MUST 在收紧安全策略后保持登录、Analytics、Turnstile、远程图片、PWA 和管理后台核心流程可用。

#### Scenario: 运行安全回归
- **WHEN** 执行覆盖核心第三方资源和 PWA 的端到端测试
- **THEN** 不出现由 CSP 或安全响应头造成的资源拦截和功能失败
