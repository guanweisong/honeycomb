> 后续归属整理（2026-10-21）：下文涉及的 `src/components/Menu` 当前迁至 `src/app/admin/components/AdminNavigation`，因为消费者全部属于后台；正文保留当时范围与授权边界，当前命名工作见 [clarify-names-and-ownership](../clarify-names-and-ownership/proposal.md)。

## 为什么

上一轮简单 Feature 架构已通过 PR #13 合并，但统计业务仍寄居 setting，媒体组件反向借用文章类型，路由与少数纯工具还存在职责错位。原阶段在保持行为不变的前提下收敛目录归属。2026-10-20 全文件审查后，用户明确批准修补已确认的运行缺陷和关键测试盲点；本变更因此不再只是目录移动，而是保留预期 API、角色与安全策略的有限纠错。

## 变更内容

- 将统计服务、router、后台页面及测试迁入 dashboard，删除无生产消费者的统计类型，保持外部 `statistic` tRPC 命名及统计读取权限不变。
- 使媒体图片选择项从 `MediaRecord` 推导所需封面字段，不再依赖 post 类型。
- 删除没有实际职责的 admin `(root)` 路由组；保留 dashboard 布局、认证与 template；由 app 直接拥有 post/page 的纯重定向路由。
- 将分类树算法迁入 category，将 UTC 格式化工具迁入 `lib/ui`，保留原行为。
- 仅压平文章无限列表 hook、MenuTitle 及独立 HTML 图片提取工具的无意义叶子层级；同步消费者、工程 SKILL 和职责门禁。
- 测试仅按清晰职责做必要小范围整理，增加文档导航与历史计划冻结说明；依据已合并证据修正上一轮完成状态，不自动归档其他变更。

- 增补审查后的六批修补：隐私与指标、文章交互、后台变更状态、菜单交互、数据库审计与隔离、测试可信度；具体范围只在任务清单集中维护。

## 能力

### 新增能力

- `directory-ownership`: 明确本轮 dashboard、媒体契约、框架路由、纯工具及窄范围整理的可测试归属约束。

### 修改能力

既有业务、安全及传输规范继续生效；新增纠错要求只恢复其预期行为，不授权重设计 API 或角色策略。

## 影响

涉及 `src/features/{dashboard,setting,media,category,post,page}`、`src/app/admin`、`src/app/trpc`、`src/components/Menu`、`src/components/blog`、`src/lib/ui`、`src/lib/db/query`，以及相应测试、文档和工程技能。修补另涉及共享后台交互、可观测性、菜单、数据库验证脚本与 CI。不得改写已应用迁移、升级依赖、改名 API、改变角色策略或访问生产数据库；遗留 JSON 仅增加前向只读预检。完整视频支持及历史规格生命周期调整仍需另行批准，不归档旧规格。不提交、推送、合并或部署；不扩大到全工程目录统一。

2026-10-20 用户批准追加“8 个薄包装文件合并＋重复规则去重”：只将已确认的单消费者页面壳、查询包装和显示映射并回现有所有者；规范、SKILL、说明及静态测试按现有职责收敛重复内容，保留独有要求与反例。具体清单在 tasks 第 9 节，不扩展 API 重设计、剩余缺陷或历史归档。
