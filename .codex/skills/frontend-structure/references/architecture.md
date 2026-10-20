# 架构规则索引

按本次改动读取下面指定的 Requirement 及其 Scenario。规则修改进入对应 OpenSpec；Skill 保留实施方法，[架构说明](../../../../docs/architecture-dependency-report.md)保留设计解释，不在这些入口复制验收正文。

| 主题 | 权威规范与具体章节 |
| --- | --- |
| 四种源码职责、业务概念归属 | [package-layer-architecture](../../../../openspec/specs/package-layer-architecture/spec.md)：源码采用四种职责目录、业务概念归属于 Feature |
| 技术库、通用 UI 与认证会话例外 | [package-layer-architecture](../../../../openspec/specs/package-layer-architecture/spec.md)：技术依赖不加载业务运行时 |
| 纯模块的直接与间接依赖 | [feature-module-contract](../../../../openspec/specs/feature-module-contract/spec.md)：模块依赖方向必须可自动验证 |
| 根 tRPC 组合、跨 feature 具名入口 | [feature-business-boundaries](../../../../openspec/specs/feature-business-boundaries/spec.md)：Transport infrastructure is separate from business features、跨 Feature 导入必须经过公开边界 |
| server 操作、入口保护、直接数据库访问、纯转发层 | [application-use-case-boundary](../../../../openspec/specs/application-use-case-boundary/spec.md)：业务操作由 Feature server 函数负责、服务端操作允许直接数据库访问、纯转发层不得作为业务抽象保留 |
| ORM 隔离与公开字段实际裁剪 | [model-boundary-governance](../../../../openspec/specs/model-boundary-governance/spec.md)：持久化实现与纯契约必须隔离 |
| 类型、schema、常量唯一事实源 | [type-safety-governance](../../../../openspec/specs/type-safety-governance/spec.md) |
| 死出口、框架约定入口及动态 feature 门禁 | [architecture-complexity-governance](../../../../openspec/specs/architecture-complexity-governance/spec.md)：架构复杂度必须有可追踪预算、Feature 边界门禁必须动态覆盖现有模块 |

涉及行为而非仅路径时，继续读取对应规范：[授权](../../../../openspec/specs/capability-authorization/spec.md)、[入口权限统一](../../../../openspec/specs/capability-authorization-unification/spec.md)、[持久化不变量](../../../../openspec/specs/persistence-integrity/spec.md)、[公开内容安全](../../../../openspec/specs/public-content-safety/spec.md)、[缓存新鲜度](../../../../openspec/specs/public-content-freshness/spec.md)、[副作用一致性](../../../../openspec/specs/side-effect-consistency/spec.md)、[运行时错误捕获](../../../../openspec/specs/runtime-error-capture/spec.md)。

本轮 dashboard、媒体选择契约、app 重定向和纯工具归属的补充验收仍在[目录归属变更](../../../../openspec/changes/refine-directory-ownership/specs/directory-ownership/spec.md)；它尚未归档，不把历史报告当作当前验证证据。

交互修改另读尚未归档的[后台读取与保存安全](../../../../openspec/changes/protect-guest-reads-and-pending-saves/specs/admin-data-and-save-safety/spec.md)，保留待保存输入与过期响应隔离。现有本地草稿恢复和重复提交拦截是路径整理不得删减的行为；不能因为这些要求尚未同步进主规范而忽略。

日志与初始化另读 [Sentry 接入说明](../../../../docs/sentry-logging.md) 的隐私边界、浏览器/服务端配置和 public DSN 回退；运行时错误捕获规范不能替代这些独有约束。
