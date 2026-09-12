## ADDED Requirements

### Requirement: 跨 Feature 导入必须经过公开边界

生产 Feature MUST NOT 直接导入其他 Feature 的 `application`、`domain`、`infrastructure`、`schemas`、`transport`、`admin` 或 `presentation` 内部路径；共享消费者 MUST 使用 `features/contracts` 或目标 Feature 的显式 `public` 出口。

#### Scenario: 导入其他 Feature 的 Infrastructure
- **WHEN** Feature 生产代码直接导入另一 Feature 的 `infrastructure` 文件
- **THEN** 架构门禁 MUST 失败并报告源 Feature、目标 Feature 和导入路径

#### Scenario: 使用公开契约
- **WHEN** Feature 通过 `features/contracts` 或目标 Feature 的 `public` 出口复用稳定模型或能力
- **THEN** 架构门禁 SHALL 允许该依赖
