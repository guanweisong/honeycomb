# 架构与依赖边界

本文记录简单 feature 架构的取舍和全仓复审方法。具体调用入口见[代码阅读地图](code-reading-map.md)。可验收规则由[架构规则索引](../.codex/skills/frontend-structure/references/architecture.md)指向现有 OpenSpec Requirement。本轮验证须使用当前工作树的证据。

## 全仓复审

1. 记录当前提交和工作树范围，按目录列出生产代码、配置、脚本、迁移、测试和历史文档。用引用搜索或 AST 扫描定位候选，区分逐文件阅读、静态扫描、运行验证和未覆盖范围。
2. 从真实入口顺着数据走到持久化、缓存或外部副作用，再核对界面反馈和行为测试。至少走过文章与页面的创建、编辑和删除，以及公开读取、评论、媒体、登录与后台列表。每条链路标出状态和规则的所有者，逐层记录实际读、写、转换和校验。配置、构建和 CI 则沿触发入口走到最终任务和测试夹具。
3. 对照下表逐类检查。每确认一种问题，用共享字段、操作或调用形状在全仓反查，核对同类入口是否有相同问题以及现成的简洁实现。优先复用承担同一职责的实现，或直接使用框架和标准库能力。

| 检查面             | 找什么                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 界面状态与生命周期 | 两处维护同一个选中项、表格参数、保存状态或记录版本，靠 effect、回调或 ref 同步。追查首载、刷新、关闭重开、切换账号或标签页、迟到结果和重复提交。                              |
| 查询与写入         | 先查 ID 再查详情并手动复排，在同一操作中重复读取配置或当前记录，写入前的探测与事务内检查职责重叠。核对实际 SQL 和调用次数，检查分页、排序、空值、旧数据与公开字段。           |
| 契约与规则         | 表单、API、命令和适配器重复解析同一份已验证数据，多个位置各自维护字段、权限、语言、环境变量、默认值或配置。区分外部输入校验、事务内鉴权、持久化不变量及各入口有意不同的策略。 |
| 抽象与闲置代码     | 只转发参数的层、只有一处使用的通用设施、仅被测试自身引用的代码。核对动态导入、文件约定、注册配置及测试入口，再判断是否存在真实职责或消费者。                                  |
| 运行时与工具链     | 同一请求重复解析或记录，同一 CI 流程重复执行检查或声明模式，多份测试夹具重复准备相同数据。分别核对正常、失败、重试和清理路径。                                                |

每项结论记录真实入口、文件和行号、重复的职责、最小改法、受影响行为及验证方式。分别列出**已证实问题**、**待验证候选**和**有现行契约的复杂度**。需要运行证据时，用定向行为测试、实际 SQL 或调用计数复核，区分候选信号和已复现问题。

收敛前核对权限、公开投影、事务内版本、确认时机、恢复语义及失败后的副作用。字段或步骤相似时，先比较这些约束再决定是否合并。验证按[质量门禁](../.codex/skills/frontend-structure/references/quality.md)选择，数据库用例遵循[测试数据库安全规范](../.codex/skills/test-database-safety/SKILL.md)。

## 按改变原因组织代码

app、features、components、lib 的区别是框架组合、业务、通用交互与技术能力，而不是四层必须依次经过的调用栈。把业务放回 feature 是为了从概念找到实现，不是要求所有 feature 具有同一目录树。可选文件示例见[目录模板](../.codex/skills/frontend-structure/references/directory-templates.md)。

统计查询由 dashboard feature 拥有，后台统计界面归对应 app 路由。分类树表达业务规则，Drizzle 查询构造和 UTC 格式化属于技术模块。具体实现见[代码阅读地图](code-reading-map.md)，归属规则见[源码架构主规格](../openspec/specs/package-layer-architecture/spec.md)。

## 缩短路径，不抹平职责

普通客户端调用经 router 到 server 操作；服务端页面读取不必为形式绕回网络协议。router 关注入口与协议，server 函数表达业务过程。两者可直接阅读和测试，比层层转发更容易看清授权、事务和失败发生的位置。调用及写入要求见 [application-use-case-boundary](../openspec/specs/application-use-case-boundary/spec.md)。

是否保留 helper 取决于它承担的独立责任，不取决于名字叫 Repository、Use Case 还是 server。具备事务、映射、并发控制或外部适配职责的函数仍有价值；字段或代码表面相似也不意味着语义相同。契约与公开投影的区别见 [model-boundary-governance](../openspec/specs/model-boundary-governance/spec.md)。

## 看依赖实际加载什么

纯类型依赖与运行时加载不同，目录名也不能证明某个模块可供浏览器使用。因此边界检查追踪间接 import、re-export、动态 import 与 require，而不只是禁止路径单词。业务 UI 由 app 路由组合，feature 间复用纯契约或 server 操作；通用组件通过注入获得业务能力。

根组合与跨 feature 规则见 [feature-business-boundaries](../openspec/specs/feature-business-boundaries/spec.md)；技术依赖及现有认证会话窄例外见 [package-layer-architecture](../openspec/specs/package-layer-architecture/spec.md) 的“技术依赖不加载业务运行时”。该例外的完整适用条件只在规范维护，不在每份 Skill 重写。

## 组件所有权

路由拥有的 UI 放在 app 各路由组的 `components`，通用 UI 放在 `src/components`。RSC/client 边界由实际依赖和指令决定。现行归属见[源码架构主规格](../openspec/specs/package-layer-architecture/spec.md#requirement-技术依赖不加载业务运行时)，此前迁移的路径映射见[迁移记录](component-ownership-migration.md)。

## 用行为证明精简安全

删掉一层不能证明行为不变。评审应沿实际数据流检查入口授权、数据库提交和后续副作用，尤其区分“写入失败”与“已提交、同步降级”。公开字段必须检查实际序列化结果，类型裁剪不等于数据裁剪。各行为的规范入口见[规则索引](../.codex/skills/frontend-structure/references/architecture.md)，权限解释见[权限矩阵](permission-matrix.md)。

迁移步骤见[迁移说明](ddd-migration-guide.md)，验证选择见[质量门禁](../.codex/skills/frontend-structure/references/quality.md)，执行命令见[测试指南](../tests/README.md)。报告本轮实际通过、失败与未运行项，不沿用历史结果。
