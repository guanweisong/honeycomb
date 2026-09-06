## ADDED Requirements

### Requirement: 安全能力文档必须描述配置条件

文档 MUST 区分默认启用、可选配置和明确接受的风险，不得把条件启用的安全能力描述为无条件保证。

#### Scenario: Turnstile 未配置
- **WHEN** 读者依据 README 评估登录和评论安全行为
- **THEN** 文档明确说明只有配置 Turnstile 时才执行验证码校验

### Requirement: 主规格必须通过严格校验

OpenSpec 主规格 MUST 提供足够明确的 Purpose 与可测试 Requirements，使全量严格校验能够成功。

#### Scenario: 执行全量严格校验
- **WHEN** 维护者运行 OpenSpec 全量严格校验
- **THEN** 不存在 Purpose 过短或结构不完整的失败项
