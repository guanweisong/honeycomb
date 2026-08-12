# Module Boundaries

## Purpose

Define maintainable responsibility boundaries for high-change comment and post
editor modules while preserving their external behavior and contracts.

## Requirements

### Requirement: 评论客户端职责隔离
系统 SHALL 将评论身份持久化、提交控制、表单呈现和评论树渲染放在职责独立的模块中，同时 MUST 保持现有评论交互行为不变。

#### Scenario: 提交顶级评论
- **WHEN** 用户填写有效评论并通过 CAPTCHA 后提交
- **THEN** 系统使用与重构前相同的目标字段、刷新流程和本地身份存储完成提交

#### Scenario: 回复评论
- **WHEN** 用户选择一条评论进行回复
- **THEN** 表单提交包含相同的 `parentId`，成功后清除回复状态并刷新评论列表

#### Scenario: 渲染评论树
- **WHEN** 评论数据包含嵌套回复或 `BAN` 状态
- **THEN** 系统保持相同的递归层级、作者链接、时间和封禁占位显示

### Requirement: 文章编辑器职责隔离
系统 SHALL 将文章表单转换、数据编排、操作按钮和类型专属字段拆分为独立模块，同时 MUST 保持表单字段、默认值、验证、提交负载和导航行为不变。

#### Scenario: 创建不同类型文章
- **WHEN** 编辑者选择文章、电影、图库或引言类型并提交
- **THEN** 系统生成与重构前相同的类型专属数据和关联标签

#### Scenario: 编辑现有文章
- **WHEN** 编辑者打开现有文章并修改内容
- **THEN** 系统保持相同的详情加载、表单回填、封面处理和更新流程

#### Scenario: 执行编辑器操作
- **WHEN** 编辑者使用保存、发布、返回或图片选择操作
- **THEN** 按钮状态、跳转目标和视觉交互与重构前一致

### Requirement: 评论 API 使用薄 Router
系统 SHALL 让评论 Router 仅声明 procedure、权限和输入，并由 service 模块负责查询、目标校验、DTO 和通知触发，同时 MUST 保持所有公开 API 契约不变。通知能力 MUST 独立于 tRPC 工具层和评论展示组件。

#### Scenario: 调用现有评论 procedure
- **WHEN** 客户端调用 `index`、`listByRef`、`create`、`update` 或 `destroy`
- **THEN** procedure 名称、输入、输出、权限和错误码与重构前一致

#### Scenario: 创建评论并发送通知
- **WHEN** 公共评论通过目标及父子关系校验并成功写入
- **THEN** 系统返回相同公共 DTO，并按原有规则通过独立通知能力发送管理员和回复通知

#### Scenario: 拒绝无效评论目标
- **WHEN** 评论目标未发布、禁止评论或父评论属于其他资源
- **THEN** 系统保持原有 `NOT_FOUND`、`FORBIDDEN` 或 `BAD_REQUEST` 行为

### Requirement: 重构模块可独立验证
系统 SHALL 为抽取的纯函数和业务 service 保留可直接测试的接口，并通过现有端到端类型关系验证组合行为。

#### Scenario: 运行回归验证
- **WHEN** 执行类型检查、Lint、全量单元测试和生产构建
- **THEN** 所有检查通过且不产生新的运行时依赖

### Requirement: DataTable 职责独立
系统 SHALL 将 DataTable 的状态参数转换、行选择、表头、表体、工具栏和分页拆分为职责独立模块，同时 MUST 保持现有公开 props 和泛型调用方式。

#### Scenario: 现有列表使用 DataTable
- **WHEN** 既有管理页面在重构后传入相同 columns、data、selection 和 onChange
- **THEN** 排序、筛选、分页、选择和操作列行为保持不变

#### Scenario: 测试表格状态
- **WHEN** 单元测试改变排序、筛选或分页
- **THEN** 纯状态 hook 生成与现有 API 相同的请求参数并在必要时重置页码和选择

### Requirement: 大型管理页使用 feature 边界
系统 SHALL 将 menu、user、link、media、page edit 和 comment 页面的查询、mutation、列定义、对话框、表单转换和页面组合职责分离。

#### Scenario: 打开管理页面
- **WHEN** 用户进入任一已迁移管理页面
- **THEN** page shell 组合 feature 模块且不直接承载全部请求、表单和对话框实现

### Requirement: 管理页重构保持外部行为
系统 MUST 保持现有 URL、tRPC 输入输出、权限结果、视觉文案和用户操作流程。

#### Scenario: 执行现有 CRUD 流程
- **WHEN** Playwright 执行列表、创建、编辑、删除或上传场景
- **THEN** 用户可见行为和服务端调用契约与重构前一致

### Requirement: 共享抽象来自稳定重复
系统 MUST 将页面特有类型和逻辑保留在 feature 内，仅当至少两个模块存在稳定相同行为时才提取新的共享抽象。

#### Scenario: 单页专用对话框
- **WHEN** 一个对话框仅由 menu 页面使用
- **THEN** 它保留在 menu feature 内而不进入全局 UI 包
