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
系统 SHALL 让评论 Router 仅声明 procedure、权限和输入，并由 service 模块负责查询、目标校验、DTO 和通知编排，同时 MUST 保持所有公开 API 契约不变。

#### Scenario: 调用现有评论 procedure
- **WHEN** 客户端调用 `index`、`listByRef`、`create`、`update` 或 `destroy`
- **THEN** procedure 名称、输入、输出、权限和错误码与重构前一致

#### Scenario: 创建评论并发送通知
- **WHEN** 公共评论通过目标及父子关系校验并成功写入
- **THEN** 系统返回相同公共 DTO，并按原有规则发送管理员和回复通知

#### Scenario: 拒绝无效评论目标
- **WHEN** 评论目标未发布、禁止评论或父评论属于其他资源
- **THEN** 系统保持原有 `NOT_FOUND`、`FORBIDDEN` 或 `BAD_REQUEST` 行为

### Requirement: 重构模块可独立验证
系统 SHALL 为抽取的纯函数和业务 service 保留可直接测试的接口，并通过现有端到端类型关系验证组合行为。

#### Scenario: 运行回归验证
- **WHEN** 执行类型检查、Lint、全量单元测试和生产构建
- **THEN** 所有检查通过且不产生新的运行时依赖
