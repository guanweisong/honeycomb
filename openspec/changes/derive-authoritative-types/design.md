## 背景

审计基线包含 448 个具名声明、6 个 inline 建议；组件迁移后 24 个声明仅路径改变。当前组件批已经独立发布，本批以本地 80be26ad 的相同源码树开始。

## 目标与非目标

目标是收敛同语义事实源，并逐项记录采纳、拒绝或保留的证据。非目标是统一所有 DTO、扩大输入协议、迁移认证入口或新增业务行为；不新增运行时 schema、通用 cast、泛型 CRUD 或转发层。

## 决策

1. schema 输入和输出分别推导；列表持久化分页继续保留独立默认策略。可选字段中的显式 undefined 按旧契约保留或排除，不把默认编译选项下的双向可赋值当作全部证明。
2. 同语义子集使用正向 Pick、Omit 和索引访问。旧测试期望仍是独立 oracle，不反向从被测实现生成。真实隐私投影、翻译聚合、技术端口和 UI 状态机不机械合并。
3. LinkRecord 只 type-only 引用 `lib/db/schema/content-link` 的 `link`，字段白名单固定为 id/url/name/logo/description/createdAt/updatedAt，status 继续使用经过验证的 EnableStatus|null。该表只依赖中立状态目录，不形成 DB→feature→DB 类型环。拒绝更宽 DB barrel、其他 types 文件或运行时依赖；mapper 明确选择 8 个现有字段。
4. UserListInput 的 email 保留内部显式扩展，不改公开查询 schema。无消费者 CategoryNode 在全仓库引用核对后移除。
5. 编辑器已确认状态、认证 provider 目录和缓存 publicSync 以权威有限集合收窄；合法枚举字符串继续可用。第三方 SDK 输入夹具允许最小 Pick，但错误路径与独立断言保留。

## 风险与权衡

- schema optional 与原手写 optional 不完全相同 → exactOptionalPropertyTypes=false/true 双模式、独立形状/双向赋值与负例验证。
- Pick 不裁剪运行时 → Link 新增字段 mock 首先红测，再投影；评论/用户现有脱敏不改。
- 类型依赖可能污染 bundle → 精确 AST 依赖例外，运行时遍历与生产构建检查继续存在。
- 目录统一可能改变观测白名单 → 只抽取相同成员并保持组合顺序，独立运行时行为测试和生成 JS 对照。

## 实施与验证

先完成所有源码、定向测试、账本及治理文档，冻结后运行最终类型/lint、架构、完整非 E2E 覆盖率与 process、生产构建和严格规格检查。数据库仅使用本轮独占本地临时库并验证清理；浏览器缺失时披露真实 E2E 未运行。最终独立本地提交；发布另需本批具体授权。
