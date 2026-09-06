## ADDED Requirements

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
