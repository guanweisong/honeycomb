# Documentation Workflow Cleanup

## Purpose

定义需求、设计、任务和完成状态以 OpenSpec 为唯一事实来源时，对未被引用且重复的临时工作流文档进行安全清理的规则。

## Requirements

### Requirement: 工作流文档单一事实来源

系统的需求、设计、任务和完成状态 MUST 以 OpenSpec 变更产物为事实来源；当 `docs/` 中存在被完整 OpenSpec 产物覆盖且未被引用的临时工作流文档时，系统维护者 MUST 移除该重复文档。

#### Scenario: 清理重复临时文档

- **WHEN** 临时文档的内容已由完整 OpenSpec 变更覆盖，且仓库内不存在对该文档的引用
- **THEN** 系统移除该文档，同时保留对应 OpenSpec 产物和长期维护文档
