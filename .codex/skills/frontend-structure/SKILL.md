---
name: frontend-structure
description: 当在 Honeycomb Next.js 工程中修改或审查路由、页面、组件、交互、样式、依赖或 feature 架构时使用。
---

# 前端工程结构规范

从实际消费者和调用链确定改动位置，不为目录对称或压平本身制造工作。验收规则以[架构规则索引](references/architecture.md)指向的 OpenSpec 为准；本 Skill 负责工作流与按需导航。

## 实施步骤

1. 搜索已有实现、契约和行为测试，确定业务所有者及本次不可变行为。
2. 业务操作或依赖边界调整时，**REQUIRED SUB-SKILL:** Use [feature-architecture](../feature-architecture/SKILL.md)。定义类型、schema、ViewModel、常量或转换时，**REQUIRED SUB-SKILL:** Use [type-safety-governance](../type-safety-governance/SKILL.md)。
3. 按任务读取下面的参考，而不是重复加载全部规则；修改真实职责所在的实现，更新消费者后删除旧出口。组件归属迁移先保存导出、测试和资源清单，同时检查静态/动态 import、mock、相对资源与 RSC/client 指令；按实际所有者移动，不因名称相似合并行为不同的组件。
4. 按[OpenSpec 流程](references/workflow.md)处理变更工件，按[质量门禁](references/quality.md)验证并说明未验证边界。

## 按需读取

- [架构规则索引](references/architecture.md)：定位目录、依赖、业务写入及安全行为的权威 Requirement。
- [目录与文件模板](references/directory-templates.md)：新增文件时选取最小示例结构。
- [Next.js 约束](references/nextjs.md)：框架入口、路由、状态与交互实现。
- [质量门禁](references/quality.md)：选择检查范围和报告证据。
- [OpenSpec 流程](references/workflow.md)：选择现有生命周期 Skill。
