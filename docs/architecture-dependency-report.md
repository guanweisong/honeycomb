# 架构与依赖边界

本文解释简单 feature 架构的取舍，不是验收规范或执行报告。具体调用入口见[代码阅读地图](code-reading-map.md)，可验收规则按[架构规则索引](../.codex/skills/frontend-structure/references/architecture.md)定位到现有 OpenSpec Requirement；历史审计的计数和结果不能当作本轮验证证据。

## 按改变原因组织代码

app、features、components、lib 的区别是框架组合、业务、通用交互与技术能力，而不是四层必须依次经过的调用栈。把业务放回 feature 是为了从概念找到实现，不是要求所有 feature 具有同一目录树。可选文件示例见[目录模板](../.codex/skills/frontend-structure/references/directory-templates.md)。

例如统计与站点配置有不同的改变原因，dashboard 独立拥有统计更便于定位；分类树表达业务含义，Drizzle 查询构造和 UTC 格式化表达技术能力。当前具体归属及兼容要求见[目录归属变更](../openspec/changes/refine-directory-ownership/specs/directory-ownership/spec.md)，而非在多个说明中维护一份目录清单。

## 缩短路径，不抹平职责

普通客户端调用经 router 到 server 操作；服务端页面读取不必为形式绕回网络协议。router 关注入口与协议，server 函数表达业务过程。两者可直接阅读和测试，比层层转发更容易看清授权、事务和失败发生的位置。调用及写入要求见 [application-use-case-boundary](../openspec/specs/application-use-case-boundary/spec.md)。

是否保留 helper 取决于它承担的独立责任，不取决于名字叫 Repository、Use Case 还是 server。具备事务、映射、并发控制或外部适配职责的函数仍有价值；字段或代码表面相似也不意味着语义相同。契约与公开投影的区别见 [model-boundary-governance](../openspec/specs/model-boundary-governance/spec.md)。

## 看依赖实际加载什么

纯类型依赖与运行时加载不同，目录名也不能证明某个模块可供浏览器使用。因此边界检查追踪间接 import、re-export、动态 import 与 require，而不只是禁止路径单词。跨 feature 的具名 UI 复用与 router 耦合不是同一件事；前者应保持业务所有权，通用组件则通过注入获得业务能力。

根组合与跨 feature 规则见 [feature-business-boundaries](../openspec/specs/feature-business-boundaries/spec.md)；技术依赖及现有认证会话窄例外见 [package-layer-architecture](../openspec/specs/package-layer-architecture/spec.md) 的“技术依赖不加载业务运行时”。该例外的完整适用条件只在规范维护，不在每份 Skill 重写。

## 用行为证明精简安全

删掉一层不能证明行为不变。评审应沿实际数据流检查入口授权、数据库提交和后续副作用，尤其区分“写入失败”与“已提交、同步降级”。公开字段必须检查实际序列化结果，类型裁剪不等于数据裁剪。各行为的规范入口见[规则索引](../.codex/skills/frontend-structure/references/architecture.md)，权限解释见[权限矩阵](permission-matrix.md)。

迁移步骤见[迁移说明](ddd-migration-guide.md)，验证选择见[质量门禁](../.codex/skills/frontend-structure/references/quality.md)，执行命令见[测试指南](../tests/README.md)。报告本轮实际通过、失败与未运行项，不沿用历史结果。
