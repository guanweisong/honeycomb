## MODIFIED Requirements

### Requirement: 直接依赖漏洞修复和开发工具隔离

系统 MUST 使用不受已知 High 或 Critical 公告影响的直接运行时依赖版本，将只在开发或测试中调用的工具保留在开发依赖中，对齐同一框架工具链的补丁版本，移除确认无生产消费者或已由聚合包覆盖的重复直接依赖，并对无法立即修复的传递风险使用精确且有期限的例外。测试直接导入的包 MUST 显式声明为开发依赖，不得依赖其他工具偶然提供的传递安装。

#### Scenario: 安装生产依赖

- **WHEN** 生产部署安装依赖
- **THEN** 不安装无消费者的复制工具、历史类型占位包或重复声明的 UI 子包，且富文本清洗、数据库、国际化和 CSS 直接依赖使用已修复版本

#### Scenario: 安装测试依赖

- **WHEN** 单元测试直接导入 glob、构建分析或其他工具包
- **THEN** 对应包 MUST 出现在 `devDependencies` 并可通过冻结锁文件独立解析

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
