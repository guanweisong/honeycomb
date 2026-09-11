## ADDED Requirements

### Requirement: 规范化翻译迁移需要已验证远程备份

系统 MUST 在对远程数据库执行规范化翻译迁移前创建可恢复导出，并验证导出的完整性、关键数据计数和内容校验值。

#### Scenario: 创建远程迁移备份

- **WHEN** 准备对目标 Turso/libSQL 数据库应用规范化翻译迁移
- **THEN** 流程 MUST 在仓库外私有目录导出 snapshot 与 WAL，限制文件权限，并记录 SHA-256 与关键表行数

#### Scenario: 备份验证失败

- **WHEN** 导出缺失、SQLite 完整性检查失败或关键表计数无法核对
- **THEN** 流程 MUST 停止且不得对远程数据库执行任何迁移写入

#### Scenario: 应用远程迁移

- **WHEN** 备份验证通过且进入已批准维护窗口
- **THEN** 流程 SHALL 只执行已提交的版本化 migrate，并在完成后验证 ledger、schema、记录计数和翻译关系完整性

#### Scenario: 远程迁移失败

- **WHEN** 版本化迁移或迁移后审计失败
- **THEN** 流程 MUST 停止发布、保留日志与备份，并按既有 runbook 恢复，不得即兴执行逆向 DDL
