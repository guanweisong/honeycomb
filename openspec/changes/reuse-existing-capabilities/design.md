## 背景

基于 PR24 的精确提交 39b65ea8，已有 TanStack、RHF、Tiptap、TypeScript 等库。重复状态与测试装配增加维护成本，但缓存失效、未知提交结果、数据库重试和隐私过滤是业务边界，不能以删行替代。

## 目标与非目标

目标：简化通用机制，证明已有行为仍受测试保护。非目标：改变数据库、鉴权、UI 样式、公开输入协议或发布/合并；不以估算删行当性能结果。

## 决策

- 媒体保留数值页码查询和当前 tRPC transport。infinite query 默认在聚焦/重挂载时重取全部历史页，与原聚焦仅当前页、重挂载首屏不同；为恢复等价语义另造适配状态机不值得，本轮暂缓。保留去重、空页停止、失败重试、刷新首屏旧列表与账号隔离；修复 reset 同轮哨兵竞态，使用真实 QueryClient 和 AbortSignal 回归。
- UTCDateMini 替换 Date 子类，保留 date-fns 格式、dayjs token 别名和非法日期空串。
- RHF 提交状态统一覆盖原生和 imperative 提交；业务锁不变。Tiptap 用官方状态订阅，但真实选区、marks、命令须回归。
- RTL/DOM 先用于媒体试点与确有净简化的装配，不新增 user-event/jest-dom、不减少安全/竞态断言。
- Map.groupBy 仅服务端已核调用；Promise.withResolvers 仅 Node24 测试。Bun.JSONC 仅 Bun CLI，Node 导入保持安全。
- Next useLinkStatus 对已预取导航不产生 pending，无法维持现有点击反馈，本轮暂缓。tinyglobby 对 symlink 的枚举语义不同，保留小型递归并复用，而非增加复杂适配器。
- 测试超时桥接只集中 fake timer 机制；实际 SDK/fetch 传输及每个 deadline 仍分别验证。

## 风险与缓解

- 分页并发/刷新竞态：增加真实红灯回归，再验证修复与账号迟到响应隔离。
- UTC 跨时区差异：UTC、New_York、Apia、DST、小年份与字面量既有测试全部保留。
- 新依赖成本：精确版本、生产审计与许可证检查，记录新增开发依赖图。
- 本地浏览器权限限制：不绕过已知 socket 限制，E2E 未执行明确记录；本地通过不等于正式 CI。

## 验证与回滚

独立工作树本地实施；分组基线和回归后运行类型、lint、覆盖率、进程门禁、构建与规格检查。数据库只用随机独占临时 SQLite 和合成数据并清理。回滚为撤回本次代码及依赖变更，无数据库迁移。
