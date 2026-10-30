# 架构规则索引

按本次改动读取下面指定的 Requirement 及其 Scenario。规则修改进入对应 OpenSpec；Skill 保留实施方法，[架构说明](../../../../docs/architecture-dependency-report.md)保留设计解释，不在这些入口复制验收正文。

| 主题                                            | 权威规范与具体章节                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 四种源码职责、业务概念归属                      | [package-layer-architecture](../../../../openspec/specs/package-layer-architecture/spec.md)：源码采用四种职责目录、业务概念归属于 Feature                                                         |
| 技术库、通用 UI 与认证会话例外                  | [package-layer-architecture](../../../../openspec/specs/package-layer-architecture/spec.md)：技术依赖不加载业务运行时                                                                             |
| 纯模块的直接与间接依赖                          | [feature-module-contract](../../../../openspec/specs/feature-module-contract/spec.md)：模块依赖方向必须可自动验证                                                                                 |
| 根 tRPC 组合、跨 feature 具名入口               | [feature-business-boundaries](../../../../openspec/specs/feature-business-boundaries/spec.md)：Transport infrastructure is separate from business features、跨 Feature 导入必须经过公开边界       |
| server 操作、入口保护、直接数据库访问、纯转发层 | [application-use-case-boundary](../../../../openspec/specs/application-use-case-boundary/spec.md)：业务操作由 Feature server 函数负责、服务端操作允许直接数据库访问、纯转发层不得作为业务抽象保留 |
| ORM 隔离与公开字段实际裁剪                      | [model-boundary-governance](../../../../openspec/specs/model-boundary-governance/spec.md)：持久化实现与纯契约必须隔离                                                                             |
| 类型、schema、常量唯一事实源                    | [type-safety-governance](../../../../openspec/specs/type-safety-governance/spec.md)                                                                                                               |
| 死出口、框架约定入口及动态 feature 门禁         | [architecture-complexity-governance](../../../../openspec/specs/architecture-complexity-governance/spec.md)：架构复杂度必须有可追踪预算、Feature 边界门禁必须动态覆盖现有模块                     |

## 编辑、恢复与媒体行为

以下主规格是已同步行为的验收入口；来源增量仍可保持活动状态，不能据此推断 CI、真实存储验证或生产发布完成。

| 主题                                         | 权威规范                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 文章原子表单、标签关系、版本与创建恢复       | [post-edit-consistency](../../../../openspec/specs/post-edit-consistency/spec.md)                                                                                                    |
| 文章严格 patch、removeLocales 与随机公开快照 | [post-patch-contract](../../../../openspec/specs/post-patch-contract/spec.md)；[normalized-content-translations](../../../../openspec/specs/normalized-content-translations/spec.md) |
| 页面版本、双语事务和创建恢复                 | [page-edit-consistency](../../../../openspec/specs/page-edit-consistency/spec.md)                                                                                                    |
| 菜单整树与设置版本、保存后刷新               | [site-snapshot-safety](../../../../openspec/specs/site-snapshot-safety/spec.md)                                                                                                      |
| 账号操作结果与过期回调                       | [account-mutation-feedback](../../../../openspec/specs/account-mutation-feedback/spec.md)                                                                                            |
| 普通媒体注册验证、已知引用拒删及失败限制     | [media-lifecycle](../../../../openspec/specs/media-lifecycle/spec.md)；[side-effect-consistency](../../../../openspec/specs/side-effect-consistency/spec.md)                         |

涉及行为而非仅路径时，继续读取对应规范：[授权](../../../../openspec/specs/capability-authorization/spec.md)、[入口权限统一](../../../../openspec/specs/capability-authorization-unification/spec.md)、[持久化不变量](../../../../openspec/specs/persistence-integrity/spec.md)、[公开内容安全](../../../../openspec/specs/public-content-safety/spec.md)、[缓存新鲜度](../../../../openspec/specs/public-content-freshness/spec.md)、[副作用一致性](../../../../openspec/specs/side-effect-consistency/spec.md)、[运行时错误捕获](../../../../openspec/specs/runtime-error-capture/spec.md)。

本轮 dashboard、媒体选择契约、app 重定向和纯工具归属的补充验收仍在[目录归属变更](../../../../openspec/changes/refine-directory-ownership/specs/directory-ownership/spec.md)；它尚未归档，不把历史报告当作当前验证证据。

交互修改另读尚未归档的[后台读取与保存安全](../../../../openspec/changes/protect-guest-reads-and-pending-saves/specs/admin-data-and-save-safety/spec.md)，保留待保存输入与过期响应隔离。现有本地草稿恢复和重复提交拦截是路径整理不得删减的行为；不能因为这些要求尚未同步进主规范而忽略。

日志与初始化另读 [Sentry 接入说明](../../../../docs/sentry-logging.md) 的隐私边界、浏览器/服务端配置和 public DSN 回退；运行时错误捕获规范不能替代这些独有约束。

当前审计边界修复的增量验收见[修复设计](../../../../openspec/changes/fix-audit-state-boundaries/design.md)及同目录 specs：文章已确认发布状态、页面嵌套媒体投影、表格查询与选择、分类/标签提交前结果组装。主规格与活动增量共同检查；实施、测试和发布状态以该变更 tasks 的实际证据为准，不因存在规格推断已上线。

本轮复审实现的现行约束另见[邮箱写入与审计](../../../../openspec/specs/better-authentication/spec.md)、[媒体分页协调](../../../../openspec/specs/admin-media-infinite-scroll/spec.md)、[响应式与可访问交互](../../../../openspec/specs/public-web-experience/spec.md)、[仅分类取消删除数量上限](../../../../openspec/specs/category-bulk-deletion/spec.md)和[公开单层导航](../../../../openspec/specs/flat-blog-navigation/spec.md)。文章会话归属、评论读取快照、布局失效及 R2 截止时间已同步到上表对应主规格；实现与验证证据仍见 [remediate-skill-reaudit](../../../../openspec/changes/remediate-skill-reaudit/tasks.md)，不据此推断精确提交 CI 或生产验证完成。

历史组件路径整理见[组件归属规范](../../../../openspec/changes/refine-component-ownership/specs/component-ownership/spec.md)。浏览器业务 UI 的现行归属以[Feature UI 迁入 App 变更](../../../../openspec/changes/move-feature-ui-to-app/design.md)及其增量规范为准：后台、登录和博客 UI 由 app 路由拥有，feature 保留业务契约与服务端实现；editor 媒体选择仍由 app 注入。

类型事实源的本轮实施记录见[类型派生说明](../../../../docs/type-derivation-refactor.md)。LinkRecord 的单文件 type-only 字段投影例外已同步到 model-boundary-governance，不是所有 feature/types 对数据库的通行证；类型派生不替代运行时白名单。

共享后台与入口策略归属见[模块归属规范](../../../../openspec/changes/refine-owned-module-locations/specs/owned-module-locations/spec.md)：UI 枚举一文件一个，业务限流数值显式留在入口，通用工厂不携带评论策略；迁移不得删除原 HTTP、草稿及失败路径断言。
