# 简单 Feature 架构迁移说明

保留此旧链接供已有引用使用；当前架构的解释见[架构与依赖边界](architecture-dependency-report.md)，验收条款见[架构规则索引](../.codex/skills/frontend-structure/references/architecture.md)。本页只维护迁移步骤，不再定义另一份目录或类型规则。

## 迁移顺序

1. 找出实际入口、调用链和行为测试，记录本次不能改变的 URL、输入输出、权限、状态转换、事务、并发保护及副作用失败语义。
2. 按规范确定现有业务与技术所有者，搜索权威 schema、类型和消费者；类型迁移使用[type-safety-governance](../.codex/skills/type-safety-governance/SKILL.md)，不以字段相同推断语义相同。
3. 在实际职责所在的函数合并纯转发入口，保留独立规则和真实适配；不要把目录迁移扩大为算法或数据结构修改。
4. 沿读取、写入、通知、缓存、transport、presentation 和测试逐项更新消费者，同时检查 mock、配置与动态引用，再删除旧出口。
5. 检查浏览器、服务端与 Edge 的真实依赖图，并对照受影响的规范 Scenario 运行行为测试。
6. 按[质量门禁](../.codex/skills/frontend-structure/references/quality.md)验证并逐项报告结果。需要数据库时遵守[测试数据库安全规范](../.codex/skills/test-database-safety/SKILL.md)，不执行生产写入。

OpenSpec 工件使用[现有生命周期流程](../.codex/skills/frontend-structure/references/workflow.md)。只更新受影响的权威条款和导航，不在 README、Skill 与迁移说明分别复制规则；保留不同语义的要求及历史验证证据。
