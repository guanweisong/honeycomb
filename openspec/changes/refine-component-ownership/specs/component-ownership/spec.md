## ADDED Requirements

### Requirement: 路由私有与通用组件保持明确归属

路由家族私有组件 MUST 位于其 _components 中，NoData MUST 就近归列表路由；共享 SectionCard、MultiLangText MUST 位于 components，TextDivider MUST 跟随 PostList。现有框架路由入口及 URL MUST 保持不变，不得为统一目录合并不同职责组件或新增兼容 barrel。

#### Scenario: 消费迁移后的展示组件

- **WHEN** 博客、后台或业务 feature 通过新路径渲染既有 UI
- **THEN** 内容、样式、导航及导出契约 MUST 保持；feature 不得反向运行时加载 app 的私有组件

### Requirement: 发布显示与媒体后台归所属业务

日期格式化 MUST 归 lib/ui 并保持既有时间及空值语义；post/page 发布颜色 MUST 分别由所属 feature 拥有，三个状态的原颜色 MUST 保持。媒体选择、管理、动作与查询 MUST 归 media/admin，通用 editor MUST 继续使用注入契约而非导入媒体业务。

#### Scenario: 显示发布状态

- **WHEN** post 或 page 显示 PUBLISHED、DRAFT、TO_AUDIT 状态
- **THEN** 颜色 MUST 分别保持 GREEN、GRAY、AMBER，两个业务均具有独立明确断言

#### Scenario: 编辑器选择媒体

- **WHEN** 编辑器调用已注入的媒体选择 renderer
- **THEN** 原动态加载、权限、上传/删除、分页、取消与过期响应行为 MUST 保持，通用 editor 不得反向依赖 feature

### Requirement: 结构迁移保留运行时与验证证据

迁移 MUST 同步测试、静态资源、mock 和所有消费者，保留原测试场景/断言/参数/钩子与资源内容。Card MUST 保持可用于 RSC 的纯展示；MultiLangText MUST 明确 client 入口；其他既有指令 MUST 不变。Providers、PostInfo 与类型派生审查 MUST 不纳入本轮改动。

#### Scenario: 验证本轮迁移

- **WHEN** 准备交付组件归属调整
- **THEN** MUST 提供逐文件映射、AST 与测试库存比较及类型/Lint/架构/完整非 E2E/构建结果，缺少浏览器的 E2E MUST 标记为未执行而非通过
