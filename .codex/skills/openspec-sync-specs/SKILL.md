---
name: openspec-sync-specs
description: 当用户希望将 OpenSpec 变更中的增量规格同步到主规格，但暂不归档该变更时使用。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.4.1"
---

# 同步 OpenSpec 规格

将已批准且有实现证据的增量语义合入主规格，保持活动变更和历史提案；规格同步不等于实施完成、CI 通过、发布或归档。

## 选择与读取

1. 使用用户指定的变更，或上下文已明确的业务范围。跨多个已实现变更的文档漂移修复可按该范围选取相关增量；仅在范围确实不明确时运行 `openspec list --json` 并请用户选择，不扩大到所有活动提案。
2. 对每个目标运行 `openspec status --change "<name>" --json`，从 `artifactPaths.specs.existingOutputPaths` 读取增量，同时读对应主规格、任务和必要设计说明。`isComplete` 仅表示工件完整，不证明实现或验收完成。
3. 若 `actionContext.mode` 为 `workspace-planning`，停止仓库内同步，说明此工作流不支持该模式；不要绕过作用域去编辑链接仓库。
4. 将每项增量与当前源码及相关行为测试交叉检查。区分已实现需求、被后续变更取代的旧规则和仍未实现的提案；不为消除文档差异修改运行时。

## 语义合并

- `ADDED`：增加不存在的 Requirement；已存在则合并，不重复创建。
- `MODIFIED`：修改对应语义与冲突场景，保留仍有效的其他场景。
- `REMOVED` / `RENAMED`：按已接受意图删除或改名，并检查其他规范和索引引用。
- 新建 `openspec/specs/<capability>/spec.md` 时写清 `Purpose`、`Requirements` 和可验证 Scenario，不留 TBD。
- 检索其他主规格中的相关术语，消除过期的竞争契约；用精确链接引用权威规则，不把域规则复制到 Skill。保留历史提案，不机械覆盖整份主规格、不自动勾选验收或归档。
- 多个增量互相冲突时，以已批准的后续变更和实际实现证据核对；无法确定的项报告差异，不猜测新规则。媒体、版本、恢复和副作用等领域从[架构规则索引](../frontend-structure/references/architecture.md)定位。

## 验证与交付

执行 `openspec validate --all --strict`、相关文档/架构门禁及 `git diff --check`；按[质量门禁](../frontend-structure/references/quality.md)和用户限定选择额外检查。文档同步不启动数据库、全套测试或发布。

交付说明新增/修改的主规格、来源变更、已修正冲突与验证结果。分别报告实现证据、规格同步、当前提交的 CI 和发布状态；历史 CI 只证明其对应提交，未运行项不能记为通过。同步应幂等，重复执行不能产生重复 Requirement。只有用户要求且归档条件确已满足时，才进入归档 Skill。
