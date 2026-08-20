## MODIFIED Requirements

### Requirement: 授权入口必须引用统一 capability
tRPC、Admin Action、Admin route 和菜单入口 MUST 引用统一 capability registry 中的 `Permission.*` 值，并通过静态测试检查入口覆盖。

#### Scenario: 入口使用未知 capability
- **WHEN** 新增入口引用未登记能力或旧字符串能力
- **THEN** 类型检查或授权边界测试 MUST 失败
