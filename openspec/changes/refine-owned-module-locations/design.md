## 背景与目标

按真实消费者归属，不统一成全局 types/hooks，也不为小文件制造无意义层级。保留 layout-context 和 editor-load-error 的内聚实现。

## 决策

- action-state 与测试归 admin/lib；query-options、enable-status-options 与测试归 admin/config；ModalType、ModalTypeName、EnableStatusName 各归独立 admin/types 文件。
- 草稿 hook、原有私有辅助与提示 UI 分开，整体测试留在同一个 draft 目录，500ms、TTL、大小、key 切换及比较删除不变。
- 后台 query client 归 app/admin/lib，认证事件解释归 app/_auth；技术库不反向依赖这些组合。
- 评论在 router 组合 5/min、专属 prefix 和 fallbackLimit=5，通用 API 120/min、750ms、生产 fail-closed 保持。通用 procedure 的 optional 输入形状不变。
- 通知查询直接使用 Drizzle getTableColumns；IP 三个旧测试完整迁入 HTTP 测试，不复制限流环境钩子。

## 风险与验证

混合 import/mock 按符号拆分，未改断言的 stub 不当作新行为。枚举与声明 AST、测试体/参数/钩子、资源和客户端边界与基线比较；目录门禁仅精确适配当前规则。先定向，再冻结后一次完整 types/lint/架构/非 E2E 覆盖率/process/build/规格；临时 DB 独占且退出清理，E2E 缺浏览器不冒充通过。

## 交付

auth-client 已独立提交；admin 与适配整理分别本地提交，最终统一审定和取得完整 payload 发布授权。PWA、sitemap、src/auth.ts 与独立类型设计不在本轮。

## admin 定向结果

迁移的 73 个顶层声明/语句、70 个 expect 调用点和两个生命周期 hook 与基线一致，三个枚举内容未变。整合后 18 文件 / 164 用例通过，布局协议及加载错误 UI 字节未变。页面查询测试的一个混合模块 mock 按两个新模块拆开，原 stub 函数与所有断言保持；只新增必要模块注册，不新增昂贵 fixture。
