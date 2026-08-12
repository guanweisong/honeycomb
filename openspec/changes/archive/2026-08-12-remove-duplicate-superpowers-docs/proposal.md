## Why

项目已经以 OpenSpec 作为需求、设计、任务和归档的唯一工作流来源，但 `docs/superpowers` 仍保留两份相同主题的临时产物。其中一份还引用已迁移的目录结构，容易让维护者误用过期信息。

## What Changes

- 删除已被 OpenSpec 变更完整覆盖的账号安全设计文档。
- 删除已被后续 OpenSpec 变更取代、且包含过期路径的包边界重构计划。
- 保留长期项目文档与全部 OpenSpec 变更及归档。

## Capabilities

### New Capabilities

- `documentation-workflow-cleanup`: 清除已被 OpenSpec 覆盖的临时工作流文档，保持单一事实来源。

### Modified Capabilities

- 无。

## Impact

- 仅删除 `docs/superpowers` 中两份未被引用的重复文档。
- 不影响应用代码、运行时行为、长期开发文档或 OpenSpec 归档。
