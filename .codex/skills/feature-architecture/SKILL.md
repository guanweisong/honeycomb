---
name: feature-architecture
description: 当在 Honeycomb 中新增、精简或审查业务逻辑、数据库操作、纯规则和 feature 依赖边界时使用。
---

# 简单 Feature 架构

先按[架构规则索引](../frontend-structure/references/architecture.md)读取本次涉及的 OpenSpec Requirement；本 Skill 只描述实施方法，不维护第二份目录、依赖例外或安全规则。

## 工作流程

1. 从实际入口追踪到持久化和副作用，阅读行为测试，记录本次不能改变的授权、状态转换、事务、条件写入和失败语义。
2. 定义类型或 schema 前，**REQUIRED SUB-SKILL:** Use [type-safety-governance](../type-safety-governance/SKILL.md)，搜索现有权威模型及其消费者。
3. 在所属 feature 的实际 server 操作中实现需求；按实质职责决定是否抽取纯规则、持久化 helper 或外部适配。用真实函数签名构造 typed fixture/mock，而不是先为测试设计生产接口。
4. 逐一验证数据库提交前后的失败路径，尤其是缓存、通知和媒体删除；按索引中的业务规范选择回归场景，不把不同副作用统一为同一种错误处理。
5. 目录迁移先列“旧模块＋导出符号 → 新具名文件”映射；枚举每个独立放所属 types/，DTO 与 runtime enum/catalog 分开检查，保留事务和副作用的真实边界。同步全部消费者、mock 和边界测试后删除旧出口。目录迁移使用[迁移说明](../../../docs/ddd-migration-guide.md)，不要顺便修改算法或外部契约。
6. 整理服务端测试时，按被测实现放到 server/ 具名测试；先保存展开用例、断言和钩子基线，只拆混合职责。真实事务及并发场景保持完整，不能重复昂贵 fixture；迁移后逐项比对测试库存和初始化次数。测试结构见[测试指南](../../../tests/README.md)。
7. 按[质量门禁](../frontend-structure/references/quality.md)验证并报告实际结果。

属于 OpenSpec 变更时，**REQUIRED SUB-SKILL:** Use [openspec-apply-change](../openspec-apply-change/SKILL.md)。需要数据库验证时，**REQUIRED SUB-SKILL:** Use [test-database-safety](../test-database-safety/SKILL.md)。
