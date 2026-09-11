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

### Requirement: 长期文档必须与可执行配置一致
README 中的框架版本、运行时要求、Application/Repository 边界、生产 Upstash 行为、PWA 能力和默认可观测性行为 MUST 与 `package.json`、生产源码及可执行测试一致。

#### Scenario: 依赖或运行时要求变化
- **WHEN** 框架版本、Node engine 或生产集成必需性发生变化
- **THEN** 同一变更更新 README，文档一致性门禁能够识别已知字段漂移

### Requirement: 保留安全风险必须明确记录
工程 SHALL 把六位密码下限和 CSP `script-src 'unsafe-inline'` 记录为已接受风险，并 MUST NOT 在文档中宣称二者已经达到严格密码或严格 CSP 标准。

#### Scenario: 阅读生产安全说明
- **WHEN** 维护者查阅 README 或本变更设计
- **THEN** 文档说明保留原因、风险边界和未来改变所需的独立评估

### Requirement: 已完成 OpenSpec 必须及时归档
OpenSpec 的 artifacts 和 tasks 全部完成且增量规格已同步后，维护者 SHALL 将变更移动到日期化 archive，并保持主规格为长期事实来源。

#### Scenario: 类型安全变更已经完成
- **WHEN** `harden-end-to-end-type-safety` 的产物、任务和主规格均确认完成
- **THEN** 它被归档且不再出现在活动变更列表
