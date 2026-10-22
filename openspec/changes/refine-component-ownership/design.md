## 上下文

基线为本地 d39e2bcc、远端 454f38c3 的共同 tree 517783d972b2024bbd691f8dd332d63543bc1751。旧组件审查的 721 文件清单使用 tree 28a8a9ae；本轮选中的 66 个原文件与最新 tree 逐字节一致，上一轮 rules/schema 迁移完整保留。

## 目标与非目标

目标：按实际消费者迁移 P01/P03/P04/P05/P06/P07/P08，共 29 个实现、31 个测试、6 个 SVG；保存真实导出、测试、资源及模块边界。
非目标：不移动或合并两套 Provider，不移动或更名 PostInfo/Align，不实施类型审计发现，不合并相似业务组件，不更改样式、路由、权限、保存/恢复、媒体或浏览器行为，不调整 CI。

## 决策

- app 的三个既有路由组件目录改为 _components；NoData 仅归列表路由。框架 page/layout/template/error/loading/route 入口及 URL 不动。
- Card 位于 components/SectionCard，保留导出名和纯展示 RSC/Client 双向可用性，不整体加 use client。MultiLangText 位于 components/MultiLangText，唯一新增明确 use client 指令，保持文本回退与语言切换。
- TextDivider 跟随唯一 PostList 消费者；admin-date-time 归 lib/ui，保留既有本地日期和无效值行为，不并入 UTC 工具。
- 发布颜色由 post/page 各自拥有，使用所属状态契约，保留共享 StatusBadge；分别验证三种状态颜色，不改变常量值。
- media/components 与 media/shared 后台实现归 media/admin，保留所有导出名、hooks、动态加载及测试。通用 editor 仍仅定义 renderer，由业务 EditorMediaProvider 注入，不反向引用 media。
- 只移动真实文件，所有静态、动态、mock、资源与门禁路径同行修改，不保留兼容 barrel。已有 index.tsx 是实际组件实现，并非新增转导出层。

## 风险与控制

- 相对 import、动态加载或 SVG 路径漏迁 → 保存逐文件映射，基于原模块解析重写并扫描旧引用；资源逐字节比较。
- RSC/client 边界漂移 → 比较原有指令，Card 保持无 client 指令，MultiLangText 单独显式标记；全量架构和生产构建验证。
- 测试数量相同但断言改变 → 比较测试体、参数、hooks、fixture AST 与展开清单；颜色映射增量独立记录。
- 过度共享或反向依赖 → 保留 Provider/PostInfo 原位及通用 editor 的注入方向，扩展现有架构门禁，不增宽例外。

## 迁移与验证

保存基线，先机械路径迁移，再集成两个颜色映射；更新当前导航与工程 Skill，不改冻结历史。执行类型、Lint、目标回归、完整架构、非 E2E 覆盖率/进程、构建及严格规格检查；需要数据库时仅用当次独占临时本地文件。浏览器可执行文件缺失则仅报告清单和未验证边界，不绕过既有下载限制。发布另待明确授权；回退只撤销本轮提交，不覆盖之前目录优化。
