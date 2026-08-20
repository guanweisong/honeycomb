## MODIFIED Requirements

### Requirement: feature application 不直接访问数据库实现
feature application MUST 只依赖领域端口和用例契约；持久化实现 MUST 位于同一 feature 的 infrastructure，并由入口层注入。

#### Scenario: 扫描核心 feature application
- **WHEN** 边界测试扫描 application 生产文件
- **THEN** 不得发现数据库连接、Drizzle schema、ORM 查询工具或数据库 query helper 导入
