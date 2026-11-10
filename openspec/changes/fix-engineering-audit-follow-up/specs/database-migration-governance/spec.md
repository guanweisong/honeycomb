## ADDED Requirements

### Requirement: 迁移时间戳和已应用记录必须吻合

迁移时间戳 MUST 严格递增。执行迁移前，目标 ledger MUST 是已审核迁移的按序前缀，执行成功后 MUST 完整匹配。

#### Scenario: 目标 ledger 有缺口或 SQL 哈希不符

- **WHEN** 目标数据库的迁移时间戳或哈希与已审核前缀不符
- **THEN** 命令拒绝执行 pending 迁移
