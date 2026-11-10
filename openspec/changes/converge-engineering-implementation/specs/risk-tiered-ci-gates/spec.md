## ADDED Requirements

### Requirement: 浏览器测试入口确定服务模式

开发与生产浏览器测试命令 SHALL 各自选择对应服务模式，并继续使用独占本地测试数据库。PR 中必跑的 workflow 合同检查 SHALL 独立于风险分类结果执行。

#### Scenario: 运行已命名的浏览器测试命令

- **WHEN** 开发者或 CI 调用开发或生产浏览器测试命令
- **THEN** 服务模式与该命令匹配，选择范围和隔离边界仍有效
