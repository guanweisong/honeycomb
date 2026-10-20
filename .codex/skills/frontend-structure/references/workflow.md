# OpenSpec 工作流

新功能、行为变化、跨模块重构或架构边界调整使用现有生命周期 Skill，不在此另建一套步骤。小型 bug、文案、局部样式和明显机械修改可直接按项目流程处理。

- 需求尚未明确：**REQUIRED SUB-SKILL:** Use [openspec-explore](../../openspec-explore/SKILL.md)。
- 创建变更工件：**REQUIRED SUB-SKILL:** Use [openspec-propose](../../openspec-propose/SKILL.md)。
- 开始或继续任务：**REQUIRED SUB-SKILL:** Use [openspec-apply-change](../../openspec-apply-change/SKILL.md)。
- 仅同步主规格：**REQUIRED SUB-SKILL:** Use [openspec-sync-specs](../../openspec-sync-specs/SKILL.md)。
- 用户要求归档已完成变更：**REQUIRED SUB-SKILL:** Use [openspec-archive-change](../../openspec-archive-change/SKILL.md)。

在 design 中记录本次调用路径、权威契约、权限和迁移取舍；不要复制[架构规范](architecture.md)。仅在实现与验证完成后归档，不把任务勾选或历史测试结果当作本轮验证。

主规格同步与归档是独立步骤：已接受且已实现的语义可先同步，活动变更仍保留未完成验收。同步时检查其他主规格是否存在相反规则，并更新索引；不得用计划工件齐全、任务勾选、历史 CI 或局部测试证明当前提交已发布。
