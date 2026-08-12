## Context

`docs/superpowers` 中的账号安全设计与包边界计划分别已由 `add-account-security-management`、`refactor-package-boundaries`、`clean-package-layer-boundaries` 和 `consolidate-package-layers` 等 OpenSpec 产物覆盖。OpenSpec 包含需求、设计、任务完成状态及归档，信息更完整且是当前工作流的事实来源。

## Goals / Non-Goals

**Goals:**

- 移除内容重复或路径过期的临时设计和计划文档。
- 确认删除目标没有仓库内引用。

**Non-Goals:**

- 不删除 `docs/permission-matrix.md` 等长期维护文档。
- 不重写或归档既有 OpenSpec 变更。

## Decisions

- 将 OpenSpec 作为此类变更的唯一记录；`docs/` 只保留长期、非工作流的开发者文档。
- 仅删除已核验无引用的两份文件，不进行目录级批量删除，避免误删未来仍有价值的内容。

## Risks / Trade-offs

- [历史阅读入口减少] → 对应 OpenSpec change 仍完整保留，且拥有更准确的任务和设计记录。
- [潜在外部链接失效] → 仓库内不存在引用；这两份临时文档不作为公开文档发布。
