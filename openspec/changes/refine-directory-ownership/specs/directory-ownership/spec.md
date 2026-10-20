## ADDED Requirements

### Requirement: dashboard 独立拥有统计业务

系统 MUST 将统计 router、服务、后台展示及所属测试归入 dashboard feature，setting MUST 只保留设置业务。独立类型文件 MUST 有实际生产契约用途，不为测试或目录对称保留。根 tRPC MUST 保持外部 `statistic.index` 与既有统计返回数据、权限和错误语义。

#### Scenario: 授权统计读取

- **WHEN** 有 statisticsRead 权限的用户通过现有 API 读取统计
- **THEN** 请求由 dashboard 实现处理，返回与迁移前一致的数据，调用方无需更改 API 名称

#### Scenario: 无权限统计读取

- **WHEN** 未登录或没有统计读取权限的用户调用现有 API
- **THEN** 原有服务端授权拒绝行为保持不变，不因页面迁移而绕过权限

### Requirement: 媒体选择项只依赖媒体权威类型

PhotoPickerItem MUST 从 MediaRecord 推导实际封面字段，MUST NOT 借用 post 类型或复制同语义字段定义；MUST 保留合法空值及展示回退。

#### Scenario: 封面信息不完整

- **WHEN** 封面缺少尺寸或草稿只恢复 coverId
- **THEN** 组件仍提供既有尺寸回退或恢复提示，并保持清除和重选能力

### Requirement: 框架路由归 app 且保留授权边界

无独立职责的 admin `(root)` 组 MUST 被移除；dashboard layout、template 和认证边界 MUST 保留。post/page 纯重定向入口 MUST 由 app 直接拥有，不再经 feature 页面壳，URL 与授权行为 MUST 不变。

#### Scenario: 内容根路径导航

- **WHEN** 已获相应访问权的用户访问 `/admin/post` 或 `/admin/page`
- **THEN** 分别进入 `/admin/post/list` 或 `/admin/page/list`，且 dashboard 模板和权限校验仍生效

#### Scenario: 未获授权访问

- **WHEN** 未登录或缺少路由访问权限的用户访问 dashboard 内的目标路由或重定向入口
- **THEN** 既有登录或禁止访问处理保持不变，不暴露受保护内容

### Requirement: 纯工具按业务与技术语义归属

分类树算法 MUST 归 category 且不加载数据库实现；UTC 格式工具 MUST 归 lib/ui；Drizzle 查询构造 MUST 位于数据库技术模块 query-builders.ts，保持查询语义不变。迁移 MUST 保留原有输入输出、顺序和副作用语义，不改变分类 SQL 防环。

#### Scenario: 分类树处理

- **WHEN** 使用既有根节点或指定父节点构造分类树
- **THEN** 节点顺序、deepPath 与原实现一致，且纯算法无需导入 Drizzle

#### Scenario: UTC 格式化

- **WHEN** 现有消费者传入相同日期与格式参数
- **THEN** 迁移后的结果及无效值行为与原实现一致，不依赖 UI 组件目录

### Requirement: 叶子路径精简不改变行为

初始目录整理 MUST 仅精简文章无限列表 hook、MenuTitle 和独立 HTML 图片提取工具的多余叶子层级，更新全部消费者并删除无职责的旧出口，不强制全仓库统一形式。

#### Scenario: 无限列表继续加载

- **WHEN** 首屏数据不足总量并请求下一页
- **THEN** 原查询键、页码、终止条件、初始数据及缓存策略保持不变，真实新增条目可被行为测试观测

#### Scenario: 菜单标题渲染

- **WHEN** 消费者通过新路径使用菜单标题
- **THEN** 既有标题内容与链接行为保持不变，旧转发文件不再存在

#### Scenario: HTML 图片提取

- **WHEN** 消费者通过 lib/content/image-links.ts 调用修正拼写后的 getAllImageLinkFromHtml
- **THEN** HTML 图片及本地化媒体提取结果与迁移前一致，旧 parser 路径和 FormHtml 拼写不再被消费

### Requirement: 整理文档与门禁不得扩大范围

相关工程技能、职责门禁、测试和文档 MUST 同步真实路径，MUST NOT 放宽安全或质量标准。测试分组 SHALL 限于低改动量的明确职责组，否则记录暂缓。文档 MUST 区分现行导航与冻结历史，上一轮完成状态 MUST 引用对应合并和 CI 证据，MUST NOT 自动归档其他变更。

#### Scenario: 阅读历史验证结论

- **WHEN** 读者查阅上一轮架构变更状态
- **THEN** 可以通过 PR #13、合并提交及对应 CI 链接确认历史完成状态，且这些结果不被宣称为本轮验证

#### Scenario: 目录迁移质量验证

- **WHEN** 本轮准备交付
- **THEN** 类型、Lint、职责门禁、行为回归、完整单元覆盖率、进程、构建与开发/生产 E2E 分别提供本轮结果，未验证项被明确披露且不能计为通过

### Requirement: 复查后的契约与运行时门禁

页面发布检查 MUST 使用页面状态来源并保持既有 404 行为。浏览器门禁 MUST 包含框架客户端入口；纯契约门禁 MUST 检查间接外部运行时依赖，且保留既有直接类型依赖限制。

#### Scenario: 间接服务端依赖

- **WHEN** 纯契约经任意命名 helper 加载 Node 或数据库运行时
- **THEN** 门禁拒绝该依赖，同时允许真正纯 helper 与合法的非运行时依赖边

### Requirement: 已批准纠错保持预期契约

审查修补 MUST 保持既有 API、角色和发布策略，MUST 先复用现有契约并更新全部消费者。错误日志 MUST NOT 含 SQL 或绑定值；指标 MUST 只保留权威有界值。删除失败 MUST 保留确认与选择状态，已提交后的刷新失败 MUST NOT 被误报为写入失败。异步 UI MUST 拒绝旧记录结果覆盖当前记录。

#### Scenario: 错误与异步失败

- **WHEN** 数据库操作拒绝、批量删除失败或切换记录后旧请求完成
- **THEN** 日志不泄露查询及绑定值，未提交的 UI 操作可原位重试，旧回调不修改新记录；成功提交后的刷新降级仍报告已提交

#### Scenario: 恢复可执行的交互

- **WHEN** 用户创建文章标签、将分类移回根、重新打开媒体选择器或操作嵌套菜单
- **THEN** 标签持久化且非提交按钮不触发表单，分类明确提交空父节点，选择器不沿用陈旧选择，导航祖先路径与活动项正确且隐藏项不可聚焦；不提供没有受支持行为的工具栏或视频插入入口

#### Scenario: 保护管理员并发状态

- **WHEN** 受控交错证实旧请求会把刚提升的管理员降级
- **THEN** 修补在写入时重新约束受保护状态，既有角色策略不变；未证实的竞态不得被宣称已修复

### Requirement: 审计与验证不得作出虚假保证

结构审计 MUST 区分已检查、差异与未验证，MUST NOT 将无法证明的结构宣称为等价。测试与 CI 数据库 MUST 为当次独占、可丢弃的本地库；遗留 JSON 预检 MUST 只读且仅报告表、字段、数量。MUST NOT 改写已应用迁移、访问生产数据、升级依赖或新增持久凭据。历史规格生命周期与完整视频支持 MUST 留待独立授权。

#### Scenario: 拒绝不安全或不兼容的验证目标

- **WHEN** 测试目标非当次独占本地库，或遗留 JSON 包含不兼容值
- **THEN** 在迁移、seed 或破坏性操作前中止，不输出原始值、不自动修正数据或历史 SQL

#### Scenario: 回归测试证明缺陷可检出

- **WHEN** 关键失败路径、字段投影、逐列迁移断言或模块导入时序发生回归
- **THEN** 对应测试使用真实边界或准确夹具独立断言并失败；门禁合并保留原覆盖与正反例，未运行的浏览器检查明确标记为未验证

### Requirement: 获批薄包装与重复规则精简

系统 MUST 将任务 9.1 指定的 8 个单消费者包装或显示映射并回既有所有者，MUST NOT 留兼容转发壳或改变运行时边界。规则去重 MUST 保留独有要求与反例，以精确引用取代重复正文，MUST NOT 自动归档历史或放宽门禁。

#### Scenario: 合并后保持真实行为

- **WHEN** 路由或页面改为直接消费实际组件、查询和显示映射
- **THEN** Suspense、provider 顺序、客户端边界、查询启用、错误、刷新和显示行为保持不变，旧 8 个生产文件不再存在

#### Scenario: 规则只维护于其权威位置

- **WHEN** 工程技能、说明和静态门禁收敛重叠内容
- **THEN** 读者可以追溯对应权威规则，独有需求和正反例不丢失；未合并的现行 spec 与未执行浏览器验证明确披露
