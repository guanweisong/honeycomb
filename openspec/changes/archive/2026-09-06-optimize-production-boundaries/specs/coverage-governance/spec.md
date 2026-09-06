## ADDED Requirements

### Requirement: 公开内容安全边界必须具备回归测试

系统 MUST 对富文本清洗、JSON-LD 安全序列化、浏览量独立上报和受限缓存刷新建立能够捕获缺失安全分支的自动化测试。

#### Scenario: 删除输出清洗调用
- **WHEN** 实现不再清洗公开富文本或不再转义 JSON-LD
- **THEN** 单元测试门禁失败

### Requirement: CI 分析任务必须是有限批处理

Bundle 分析命令 MUST 在生成静态诊断结果后自行退出，不得依赖长期运行的本地分析服务器。

#### Scenario: CI 执行 bundle 分析
- **WHEN** 分析器成功完成构建
- **THEN** 命令写出静态结果并以成功状态退出
