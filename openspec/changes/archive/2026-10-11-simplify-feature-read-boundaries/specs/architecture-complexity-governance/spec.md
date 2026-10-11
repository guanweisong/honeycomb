## ADDED Requirements

### Requirement: Feature 边界门禁必须动态覆盖现有模块

架构边界测试 MUST 从 `src/features` 自动发现业务 Feature，并将每个发现的模块纳入适用的结构和 transport 检查。新增 Feature 不得因未更新测试名单而绕过门禁。

#### Scenario: 仓库新增 Feature 目录

- **WHEN** `src/features` 下新增包含生产代码的 Feature 目录
- **THEN** 该目录 MUST 自动进入跨 Feature 依赖、Application/Infrastructure 结构及写入入口检查

#### Scenario: 测试夹具包含非法写入口

- **WHEN** Router mutation 未调用本 Feature 的 Application 函数
- **THEN** 架构门禁 MUST 报告该 mutation，而不能仅通过检查旧 service 路径是否存在来判断
