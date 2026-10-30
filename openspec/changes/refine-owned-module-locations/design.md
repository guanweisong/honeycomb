## 背景与目标

按真实消费者归属，不统一成全局 types/hooks，也不为小文件制造无意义层级。保留 layout-context 和 editor-load-error 的内聚实现。

## 决策

- 后台专属的 action-state、query-options、enable-status-options、UI 枚举和本地草稿实现归 `src/app/admin/(dashboard)`：分别放在 `lib`、`config`、`types`、`draft`，枚举仍各自独立文件。它们属于 app 组合，不放在通用 `src/components`。
- AdminLayout 的 header context 归 `src/app/admin/components/AdminLayout`；文章和页面编辑器共用的 `EditorLoadError`、`LocalDraftPrompt` 直接归 dashboard 根 `components`。草稿 hook、私有辅助与完整场景测试仍按职责归 `draft`，500ms、TTL、大小、key 切换及比较删除不变。
- 后台 query client 归 app/admin/lib，认证事件解释归 app/auth；技术库不反向依赖这些组合。
- 评论在 router 组合 5/min、专属 prefix 和 fallbackLimit=5，通用 API 120/min、750ms、生产 fail-closed 保持。通用 procedure 的 optional 输入形状不变。
- 通知查询直接使用 Drizzle getTableColumns；IP 三个旧测试完整迁入 HTTP 测试，不复制限流环境钩子。

## 风险与验证

混合 import/mock 按符号拆分，未改断言的 stub 不当作新行为。枚举与声明 AST、测试体/参数/钩子、资源和客户端边界与基线比较；目录门禁仅精确适配当前规则。先定向，再冻结后一次完整 types/lint/架构/非 E2E 覆盖率/process/build/规格；临时 DB 独占且退出清理，E2E 缺浏览器不冒充通过。

## 交付

auth-client 已独立提交；admin 与适配整理分别本地提交，最终统一审定和取得完整 payload 发布授权。PWA、sitemap、src/auth.ts 与独立类型设计不在本轮。

## admin 定向结果

迁移的 73 个顶层声明/语句、70 个 expect 调用点和两个生命周期 hook 与基线一致，三个枚举内容未变。整合后 18 文件 / 164 用例通过，布局协议及加载错误 UI 字节未变。页面查询测试的一个混合模块 mock 按两个新模块拆开，原 stub 函数与所有断言保持；只新增必要模块注册，不新增昂贵 fixture。

后续归属修正仅调整 app 专属后台工具的位置：`src/components/admin` 不再承载后台应用状态、配置、类型、草稿或 UI；其导出、行为与既有测试内容保持。

## 适配定向结果

四个移动实现/测试文件逐字相同，原有 71 个测试声明、171 个断言、11 个 hook 和 53 个 fixture/mock 调用保持。三项新评论组合回归验证 5/min、独立 prefix、fallback=5 及 handler 前拒绝。Drizzle 直接调用的 16 字段投影与仓储签名等价；13 文件 / 85 项定向用例、受改文件 lint 和定向类型检查通过。初跑一个跨模块测试缺合成认证环境，补配置后通过；新测试 fixture 已在类型检查发现并修正，最终重跑通过。

## 共同最终结果

源码于 2026-10-22 10:21:48 UTC 冻结，完整检查于 10:22:22 至 10:25:59 UTC 通过，之后仅补结果记录。类型 14 秒、lint 27 秒、架构 4 秒；覆盖率通道 451 文件 / 3162 用例（119.15 秒），process 通道 6 文件 / 102 用例（28.33 秒），合计 457 文件 / 3264 项非 E2E；生产构建 22 秒、73 项严格规格通过。临时本地 DB 已清理。

覆盖率 statements 93.24%（6434/6900）、branches 88.48%（4165/4707）、functions 93.04%（1885/2026）、lines 94.37%（6010/6368）。映射后的原文件无缺失；删除纯转发壳减少一个已覆盖函数，草稿拆分增加一条已覆盖 client 指令，评论限制声明在 lib/router 间移动，通用限流入口分支从 5/7 提升为 6/6。其余原文件计数一致，没有调整覆盖范围或门槛。

真实 E2E 仍因浏览器可执行文件缺失而未运行；不把构建或 mock 测试当作浏览器验收。本批准备发布的提交依次为 auth-client、admin 归组、入口适配，等待完整 payload 的明确发布确认，不创建 PR、合并或部署。
