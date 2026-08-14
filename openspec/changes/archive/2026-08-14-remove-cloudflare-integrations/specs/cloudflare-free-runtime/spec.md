## ADDED Requirements

### Requirement: 移除 Cloudflare 部署支持
应用 MUST 不再包含 Cloudflare 的部署适配器、构建命令、Wrangler 配置或仅验证 Cloudflare 产物的测试。

#### Scenario: 执行默认构建
- **WHEN** 维护者执行项目默认生产构建
- **THEN** 构建不调用 OpenNext 或 Wrangler

#### Scenario: 使用运行时 Cloudflare 服务
- **WHEN** 部署配置了 R2 或 Turnstile
- **THEN** 应用继续按既有环境变量和 CSP 行为使用这些运行时服务
