# Documentation Workflow Cleanup

## Purpose

定义需求、设计、任务和完成状态以 OpenSpec 为唯一事实来源时，对未被引用且重复的临时工作流文档进行安全清理的规则。

## Requirements

### Requirement: 工作流文档单一事实来源

系统的需求、设计、任务和完成状态 MUST 以 OpenSpec 变更产物为事实来源；当 `docs/` 中存在被完整 OpenSpec 产物覆盖且未被引用的临时工作流文档时，系统维护者 MUST 移除该重复文档。

#### Scenario: 清理重复临时文档

- **WHEN** 临时文档的内容已由完整 OpenSpec 变更覆盖，且仓库内不存在对该文档的引用
- **THEN** 系统移除该文档，同时保留对应 OpenSpec 产物和长期维护文档

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
