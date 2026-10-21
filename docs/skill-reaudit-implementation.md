# 全仓复审建议实施记录

基线：`3d668455a746dd6bfc9c69cec7cf0f9d5fb539de`。20 组 / 51 明细逐项处置；不是将 51 项全部视为生产缺陷。完整机器可读证据见 [逐项账本](skill-reaudit-implementation-ledger.json)。

## 范围与约束

- 保留扁平博客菜单、媒体 hover 与无生命周期、仅分类无 100 删除上限、QUOTE 双语/回退、日期范围及版本写入。
- 不改依赖版本/锁文件，不增加生产迁移，不访问生产数据库，不合并或部署。
- 邮箱现状“都是小写”来自用户确认，不是生产查询。未来后台创建/真正修改邮箱统一小写并在事务内防碰撞；原样回传的历史邮箱不迁移，歧义审计不归属账号。无新增索引，不声称拦截绕过后台的直接写入。

## 本轮验证

- 各模块先记录能区分旧实现的 RED，再做 focused 回归；同一测试可能重复运行，不将各批次相加冒充独立全套总数。
- 评论读取候选已用真实隔离 libSQL 确定性复现，4 条竞争场景 RED，修复后 19 条测试通过；临时目录及数据库已确认清理。
- 严格 OpenSpec：68 项通过；文档一致性测试 6/6 通过。集成 tsc、全仓 ESLint 与差异检查通过。最终重点批次 114 通过 / 3 个 auth-build 初始化超时；未放宽 5 秒门槛。精确提交 CI 与三个新浏览器回归待发布后确认，最终结果见 PR #17；上一提交绿灯不替代本轮证明。
- 浏览器启动受本地 sandbox/socket/容器挂载限制，实际几何未在本地验证；新增三个真实 Playwright 回归交由既有 CI 执行。
- 本地测试曾因媒体页 mock 每次 render 造新 query data 而无限更新；稳定为真实 TanStack 快照契约后 37 条相关回归通过。早期 fork/导入超时记录保留，未放宽门槛。
- 冻结安装仅补齐已有锁定 Sentry 11.8.0 等缺失包，package.json/bun.lock 未改变。

## 整体文档漂移核对

共全文核对 607 个文档路径（项目文档 38、规格/工程技能 569），逐路径账本无漏项或重复；另核对 43 个生产文件注释。修正 README、当前规格、缓存验证、测试说明与历史替代说明。历史测试计数仍保留为当时证据，不作为当前承诺。持续同步/未保存状态文案移除，但保存成功后的公开刷新失败降级提示保留。

## 性能结论边界

- 媒体引用查找改用 Set，合成 32-key probe 的属性访问由 1024 次降为 32 次；这不是耗时、生产延迟或用户体验收益测量。
- 历史 INFRA-011 的重复 active-scroll 基线仍待真实浏览器测量，不新增推测阈值，不宣称完成性能优化闭环。

## 逐项索引

| ID             | 组                       | 审查事项                                                                                                   | 当前处置               |
| -------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------- |
| FE-CURRENT-001 | R09                      | 返回顶部按钮在移动视口被固定平移到屏幕外                                                                   | 已实施；最终 CI 见 PR #17 |
| FE-CURRENT-002 | R03                      | 页面详情提前启动的评论 Promise 在失败/404 路径失去拒绝处理                                                 | 已实施；最终 CI 见 PR #17 |
| FE-CURRENT-003 | R17                      | sitemap 分类 URL 未按真实菜单祖先拼接                                                                      | 已实施；最终 CI 见 PR #17 |
| RT1-001        | R16                      | Notification settings read still takes an unordered first row instead of the stable singleton key          | 已实施；最终 CI 见 PR #17 |
| RT1-002        | R13                      | Auth build tests repeat unexplained inline double assertions outside a named adapter                       | 已实施；最终 CI 见 PR #17 |
| RT1-C01        | candidate_or_measurement | Public comment reads combine an earlier publication gate with a later comment snapshot                     | 已实施；最终 CI 见 PR #17 |
| FE-B2-001      | R13                      | 后台壳与布局测试仍用 as never 绕过真实契约                                                                 | 已实施；最终 CI 见 PR #17 |
| FE-B2-002      | R11                      | 表格多选筛选器渲染没有名称的独立 Checkbox                                                                  | 已实施；最终 CI 见 PR #17 |
| FE-B2-003      | R12                      | 后台导航与侧栏没有减少动态效果分支                                                                         | 已实施；最终 CI 见 PR #17 |
| FE3-01         | R05                      | External rich-text synchronization is reported as a user edit                                              | 已实施；最终 CI 见 PR #17 |
| FE3-02         | R12                      | Link URL entry has no explicit accessible label                                                            | 已实施；最终 CI 见 PR #17 |
| FE3-03         | R13                      | Editor test doubles still bypass the explicit type-safety contract                                         | 已实施；最终 CI 见 PR #17 |
| FE3-04         | R10                      | Valid English-only localized values initially appear blank in admin tables                                 | 已实施；最终 CI 见 PR #17 |
| FE4-01         | R02                      | Older category save closes a newer edit dialog                                                             | 已实施；最终 CI 见 PR #17 |
| FE4-02         | R11                      | Comment and link row icon buttons have no accessible names                                                 | 已实施；最终 CI 见 PR #17 |
| FE4-03         | R12                      | Admin comment and link search inputs lack associated labels                                                | 已实施；最终 CI 见 PR #17 |
| FE4-04         | R09                      | Media picker sheet has a desktop-only minimum width                                                        | 已实施；最终 CI 见 PR #17 |
| FE4-05         | R12                      | Focusable tab panels remove all visible focus styling                                                      | 已实施；最终 CI 见 PR #17 |
| FE4-06         | R13                      | Media picker test fixtures bypass the full media contract                                                  | 已实施；最终 CI 见 PR #17 |
| FE5-01         | R13                      | 文章侧栏测试用 as never 掩盖不完整业务夹具                                                                 | 已实施；最终 CI 见 PR #17 |
| FE5-02         | R12                      | 引用正文与作者输入没有关联标签                                                                             | 已实施；最终 CI 见 PR #17 |
| FE6-01         | R20                      | 文章更新的旧请求仍刷新并反馈，且占用新记录提交状态                                                         | 已实施；最终 CI 见 PR #17 |
| FE6-02         | R02                      | 标签旧保存会关闭新打开的编辑弹窗                                                                           | 已实施；最终 CI 见 PR #17 |
| FE6-03         | R12                      | 文章搜索、密码与 Passkey 表单仅依赖占位文字                                                                | 已实施；最终 CI 见 PR #17 |
| FE7-01         | R11                      | 用户管理行操作图标没有可访问名称                                                                           | 已实施；最终 CI 见 PR #17 |
| FE7-02         | R12                      | 登录与用户搜索输入缺少关联标签                                                                             | 已实施；最终 CI 见 PR #17 |
| FE7-03         | R09                      | 登录面板固定宽度与定位使小屏或短视口内容不可达                                                             | 已实施；最终 CI 见 PR #17 |
| FE7-04         | R12                      | 登录背景视频无限自动播放且不响应减弱动态偏好                                                               | 已实施；最终 CI 见 PR #17 |
| GOV7-001       | R19                      | 验证摘要把仅分类的无数量上限写成通用批量删除合同                                                           | 已实施；最终 CI 见 PR #17 |
| TEST-AUTH-001  | R15                      | UserLevel 重命名后，授权静态门禁漏掉别名角色比较                                                           | 已实施；最终 CI 见 PR #17 |
| RB2-001        | R18                      | Test cleanup can skip the competing client close; interruption handling is an execution concern            | 已实施；最终 CI 见 PR #17 |
| RB2-002        | R13                      | Link tests still accept impossible persistence fixtures and bypass expressible checks                      | 已实施；最终 CI 见 PR #17 |
| RB2-003        | R16                      | Link list filters still have parallel schema and server field inventories                                  | 已实施；最终 CI 见 PR #17 |
| RB2-004        | candidate_or_measurement | Media reference checks repeat linear scans inside serialized writes                                        | 已实施；最终 CI 见 PR #17 |
| RB3-001        | R04                      | Legitimate equal-ID adjacent media page is never reconciled                                                | 已实施；最终 CI 见 PR #17 |
| RB3-002        | R13                      | Media/menu tests bypass actual read and persistence shapes                                                 | 已实施；最终 CI 见 PR #17 |
| RB3-003        | R16                      | Menu save transform maintains a parallel write field inventory                                             | 已实施；最终 CI 见 PR #17 |
| RB4-001        | R13                      | Tag rendering tests bypass the real props contract with as never                                           | 已实施；最终 CI 见 PR #17 |
| RB4-002        | R14                      | Enum rejection tests pass for an unrelated missing creation token                                          | 已实施；最终 CI 见 PR #17 |
| RT5-TYPE-001   | R16                      | PostTranslationInput repeats the authoritative PostFields translation field contract                       | 已实施；最终 CI 见 PR #17 |
| RT5-TEST-002   | R14                      | Guest adminDetail unit test encodes a successful DRAFT response contrary to the actual visibility contract | 已实施；最终 CI 见 PR #17 |
| RB6-001        | R08                      | Login validation rejects credentials that account writes accept                                            | 已实施；最终 CI 见 PR #17 |
| RB6-002        | R07                      | Mixed-case administrator email cannot be resolved by failed-login audit                                    | 已实施；最终 CI 见 PR #17 |
| RT7-TYPE-001   | R16                      | 五个翻译表的语言 CHECK 仍平行维护 zh/en 成员                                                               | 已实施；最终 CI 见 PR #17 |
| RT7-TEST-002   | R13                      | 用户路由成功 mock 与真实返回记录及目标 ID 不一致                                                           | 已实施；最终 CI 见 PR #17 |
| RT7-TYPE-003   | R13                      | 测试适配边界仍存在分散双重断言、无类型 SDK mock 和非空逃逸                                                 | 已实施；最终 CI 见 PR #17 |
| RB8-001        | R06                      | R2 流读取缺少截止时间，可持续占用全部媒体验证名额                                                          | 已实施；最终 CI 见 PR #17 |
| RB8-002        | R18                      | R2 immutable 测试先创建客户端后配置环境，依赖此前测试遗留变量                                              | 已实施；最终 CI 见 PR #17 |
| RB8-003        | R13                      | QueryCache 回调测试用 as never 伪造 Error 与 Query                                                         | 已实施；最终 CI 见 PR #17 |
| TEST-GUARD-002 | R15                      | 管理按钮权限门禁将直接布尔绕过误判为有效保护                                                               | 已实施；最终 CI 见 PR #17 |
| CACHE-001      | R01                      | 公开布局失效路径漏掉 route group，页面作者快照不能按既定计划刷新                                           | 已实施；最终 CI 见 PR #17 |
