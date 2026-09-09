## ADDED Requirements

### Requirement: 依赖审计输出必须唯一且可靠地解析

生产依赖审计 MUST 支持锁定 Bun 版本在 JSON 前输出的 ANSI 控制码、dotenv 提示和版本 banner，并 MUST 只在 stdout 包含唯一、结构合法的审计 JSON 对象时继续评估。

#### Scenario: 解析带 Bun 前缀的审计结果

- **WHEN** `bun audit --json` 在合法 JSON 前输出 dotenv 提示、ANSI 颜色码或版本 banner
- **THEN** 门禁 MUST 提取并评估该 JSON，而不是因前缀产生语法错误

#### Scenario: 审计输出缺失 JSON

- **WHEN** 命令 stdout 不包含结构合法的审计 JSON 对象
- **THEN** 门禁 MUST 失败并报告无法解析结果

#### Scenario: 审计输出包含歧义结果

- **WHEN** 命令 stdout 包含多个结构合法的审计 JSON 对象
- **THEN** 门禁 MUST 失败且 MUST NOT 猜测使用其中一个结果
