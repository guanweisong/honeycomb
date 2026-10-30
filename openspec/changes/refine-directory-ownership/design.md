## 背景

当前 `setting/statistic.router.ts` 调用 `setting/server.ts` 的 `getStatistics`；dashboard 页面与统计类型同样寄居 setting。`PhotoPickerItem` 通过 post 详情类型取得封面，尽管使用的只是媒体字段。admin `(root)` 的包装、post/page 的 feature 重定向页、数据库工具中的分类树算法和组件目录中的 UTC 工具形成了职责混淆。重构沿用简单 Feature 结构，不重新引入层次或统一出口。

## 目标与非目标

目标：最小路径和明确所有者；迁移所有真实消费者；原目录阶段证明行为等价，追加修补阶段以失败回归证明已确认缺陷被纠正，保持预期接口与角色策略；同步工程技能与门禁。

非目标：调整统计计算、路由 URL、发布规则、GUEST 范围、数据库结构、依赖或缓存策略；超出已确认修补的算法重写；新增完整视频支持、改写已应用迁移、访问生产数据库或创建持久凭据；历史规格生命周期调整、自动归档、提交、推送、合并、部署。

## 决策

### dashboard 拥有统计

以 `features/dashboard/router.ts`、`server.ts`、实际后台组件及必要测试为最少结构；路由直接消费展示组件，不保留纯转发 admin/page.tsx。统计输出由服务端实现与 tRPC 推断，不为测试保留未使用的独立类型。以真实消费者决定是否需要显式契约，不强制 types.ts。

从 setting 提取统计代码，不搬动站点设置、翻译和配置操作。`app/trpc/router.ts` 仍将统计 router 注册为 `statistic`。保留 `statisticsRead`、输入输出和数据库计算方式。相比继续使用 setting 或创建通用统计层，dashboard 能表达现有业务且无需兼容转发。

### 媒体封面从权威模型推导

`PhotoPickerItem` 以 `Pick<MediaRecord, "id" | "url" | "width" | "height">` 表达实际需求，并保留原有可空、可选语义。现有 `MediaRecordSchema` 是来源，不新增同字段 schema，不改完整媒体或文章 DTO。组件仍处理只恢复 coverId、缺失尺寸回退和清除/重选行为。不能以复制封面 interface 替代错误依赖。

### app 拥有框架路由

核对 `(root)/layout.tsx` 确实没有独立职责后，移除该组并将 login、forbidden、`(dashboard)` 提升一级。dashboard 的 layout、template、访问判定及测试整体保留并更新引用。post/page 根路由直接包含原本的客户端 replace 逻辑，删除 feature 的转发壳；不为“更简单”直接改成服务端 redirect，避免认证和导航时序变化。严格保持 `useLayoutEffect`、`router.replace` 及历史替换语义，不引入服务端 redirect 或新认证 helper。

### 纯工具归属由语义决定

`Tools.sonsTree` 迁入 category 的具名纯工具，更新消费者与测试，保留遍历顺序、deepPath、起始父节点以及原有对象修改行为，不顺便改算法。Drizzle 查询工具重命名为 `lib/db/query/query-builders.ts`，查询构造语义不变；分类 SQL 防环不动。`components/blog/utc-format.ts` 迁入 `lib/ui/utc-format.ts`，保留格式 token、时区和无效值行为；不建立万能 utils 集合。

### 叶子压平限于明确对象

将 `features/post/public/hooks/rq/post/use.infinite.query.post.list.ts` 放到 post/public 下更直接的具名 hook 路径；将 MenuTitle 移至 Menu 内直接文件；独立的 HTML 图片提取工具从 `lib/content/parser/get-all-image-link-form-html.ts` 迁入 `lib/content/image-links.ts`，将函数名中的 `FormHtml` 拼写修正为 `FromHtml`，保持 HTML 本地化媒体提取行为不变。不得扩散到统一所有组件命名，不复制 HTML 解析器或把领域工具推入 components。行为、query key、分页终止条件、预载数据、刷新和缓存时间保持原样。

### 文档及测试从严控制范围

优先保持相邻行为测试与现有测试发现配置；根 tests 的既有 62 个顶层测试仅按 architecture、tooling、integration 浅分组，保持文件集合与覆盖范围完整，不移动 e2e、fixtures、helpers、setup。若需要全局配置修改或造成广泛改写，则记录暂缓。增加 docs 导航，标明现行读取入口和历史计划；历史方案冻结为背景，不覆盖 OpenSpec 事实来源。上一轮 `simplify-feature-architecture` 的完成状态按 PR #13 合并与 CI 证据补记，保留历史检查点、明确后续证据覆盖旧“待验证”状态，不把历史 CI 计作本轮测试结果。

依据：PR https://github.com/guanweisong/honeycomb/pull/13，合并提交 `bc07eb302e86d7a5c2bf8856f7a5cb32c5b1dea9`，合并后检查 https://github.com/guanweisong/honeycomb/actions/runs/39367870674（1984 单元、48 进程、64 E2E 通过）。本轮不自动执行归档。

### 全文件审查后的有限纠错

用户已批准修补已确认运行缺陷与关键测试盲点，具体六批范围见任务 8.1–8.6，不再以“纯搬目录”解释这些行为变化。先写能捕获旧缺陷的回归，再在实际责任模块修补并同步全部消费者；先检查现有 API 能否满足需求，不默认增加响应字段、兼容层或第二套契约。

数据库错误采用安全分类与允许元数据，不能靠文本关键字猜测任意绑定值；指标只扩充权威有界目录。异步 UI 区分写入失败与已提交后的刷新降级，保留失败现场、隔离过期记录回调；移除不受支持的视频入口，不放宽清洗白名单。管理员降级竞态必须先通过受控交错证明，才能在条件写入边界修补，未证实时只记录证据不足。

结构审计仅报告真实覆盖范围，无法证明等价时不得输出一致；数据库验证与 CI 统一限制为当次独占临时本地库。遗留 JSON 只读预检遇到不兼容值时中止，仅报告表、字段、数量，不修改历史 SQL 或原始数据。新回归断言应独立于实现，覆盖真实输入、投影、导入时序和失败路径，重复门禁仅在保留原覆盖及正反例后合并。

## 风险与权衡

- 路由树移动导致授权边界或模板重新挂载语义变化 → 保留 dashboard 边界，并测试已登录、未登录、无权限访问及两个重定向目标。
- 类型迁移意外收窄合法空值 → 编译检查全部调用方，保留封面尺寸缺失和仅 coverId 恢复测试。
- 静态门禁绑定旧路径 → 更新真实职责与正反例，不以删除检查或放宽阈值换取通过。
- 批量移动掩盖业务差异 → 分职责小步迁移，核对重命名差异及删除旧出口，必要时暂缓低收益测试整理。
- 历史说明与当前状态混淆 → 文档记录证据日期和来源；新变更所有验证单独执行。

## 迁移与回退

先补足目标行为与归属测试，再依次完成 dashboard、媒体类型、app 路由、工具、叶子整理、文档和门禁同步。每步更新全部导入再删除旧出口，不保留纯转发文件。运行类型、Lint、相关测试、完整单元覆盖率、进程测试、构建、开发与生产 E2E、严格 OpenSpec 校验及差异检查；数据库测试只用独占临时库。无数据迁移；原目录阶段按路径与导入回退，追加修补按批次回退对应实现和回归，不能回退其他工作。

## 待确认事项

无阻塞设计问题。测试分组是否值得移动由实际消费者与门禁影响决定；可在结果中明确暂缓，不扩大范围。

## 文件必要性精简的追加决策

按 tasks 9.1 的 8 个明确对象并回既有所有者，保留 Suspense/provider 顺序、客户端边界及查询状态，不抽取替代包装。规则以现行 OpenSpec 的独有要求为验收依据，SKILL 只补实施流程、文档只补解释并链接权威位置；静态门禁按 feature/library/模型职责去重并保留独特反例。主 spec 合并涉及活动 delta 同步，暂不删除或改写其要求；不处理第二批低收益候选及文章原子写入。
