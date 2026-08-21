# OpenSpec 工作流

涉及新功能、行为变化、跨模块重构或架构边界调整时：

1. 先在 `openspec/changes/<change>/` 创建 proposal、design、tasks 和必要的 delta spec。
2. 在 design 中记录调用路径、目录模板、单一事实源、权限和迁移策略。
3. 按 tasks 实施，每完成一项同步勾选并运行最小相关验证。
4. 完成后运行完整质量门禁，检查旧入口和重复定义。
5. 只有实现和验证完成后才 archive；小型 bug、文案、局部样式和明显机械修改可直接按项目流程处理。
