## Purpose

确保生产依赖不包含仅用于开发的工具，及时修复直接与传递依赖中的已知安全公告，并以自动化审计和有期限例外持续控制生产供应链风险。
## Requirements
### Requirement: 直接依赖漏洞修复和开发工具隔离

系统 MUST 使用不受已知 High 或 Critical 公告影响的直接运行时依赖版本，将只在开发中调用的工具保留在开发依赖中，对齐同一框架工具链的补丁版本，移除确认无生产消费者的依赖，并对无法立即修复的传递风险使用精确且有期限的例外。

#### Scenario: 安装生产依赖

- **WHEN** 生产部署安装依赖
- **THEN** 不安装 `shadcn` CLI、类型占位包或无消费者的复制工具，且富文本清洗、数据库、国际化和 CSS 直接依赖使用已修复版本

#### Scenario: 框架工具版本对齐

- **WHEN** Next.js 与配套 ESLint 配置使用同一发布线
- **THEN** 两者 MUST 使用相同补丁版本并通过冻结锁文件安装

#### Scenario: 发现生产 High 或 Critical 漏洞

- **WHEN** 依赖审计发现生产可达的 High 或 Critical 公告
- **THEN** CI MUST 失败，除非该 advisory 的精确依赖路径存在未过期且包含补偿措施的例外

#### Scenario: 例外到期

- **WHEN** 安全例外的到期日早于当前日期
- **THEN** CI MUST 失败并要求重新修复或复核该风险

#### Scenario: 开发工具传递漏洞

- **WHEN** 漏洞仅存在于不进入生产安装或运行时的开发工具链
- **THEN** 系统 SHALL 单独记录其范围，且不得把它误报为生产运行时风险

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

### Requirement: 已接受风险必须在后续治理中重新审计
存在未过期 High 或 Critical 精确例外时，后续依赖治理变更 MUST 重新运行实时生产可达性审计，并 SHALL 优先验证相关直接依赖是否已有兼容升级。

#### Scenario: 上游发布兼容修复
- **WHEN** 相关直接依赖的新兼容版本不再解析到受影响的传递依赖
- **THEN** 工程升级该依赖、删除对应例外并通过完整质量门禁

#### Scenario: 上游仍无兼容修复
- **WHEN** 安全升级会违反其他消费者版本范围或引入破坏性行为
- **THEN** 工程保留精确路径、负责人、缓解措施、跟进条件和未过期复核日期，不使用不兼容全局 override

#### Scenario: 审计网络不可用
- **WHEN** 执行环境无法访问漏洞数据库
- **THEN** 验证记录标记实时审计未完成，不得把历史清单表述为当前通过
