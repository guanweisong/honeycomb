# public-web-experience Specification

## Purpose
保证公开内容具备稳定的首屏、语义导航、响应式交互与可访问的渐进增强，并保持多语言、动态浏览量与静态正文的缓存边界一致，使键盘、移动设备和失败恢复路径均可用。
## Requirements
### Requirement: 浏览量展示必须从动态计数结果更新
公开文章和页面 SHALL 在客户端尽力上报浏览量，并 MUST 使用 mutation 返回值或轻量查询更新显示计数；浏览量写入不得触发 Full Route Cache 失效。

#### Scenario: 浏览量上报成功
- **WHEN** 已发布内容的浏览量 mutation 返回最新计数
- **THEN** 当前页面显示该计数且不执行 `revalidatePath`

#### Scenario: 浏览量读取或上报失败
- **WHEN** 浏览量动态请求失败
- **THEN** 正文保持可读，计数保留静态兜底或隐藏且不进入破坏性错误状态

### Requirement: 页面元数据提供完整的公开索引关系
公开站点 MUST 提供有效 `metadataBase`、默认 Open Graph/Twitter 图片、canonical URL 和中英文 alternate URL；内容详情 SHALL 使用本地化标题覆盖默认值。

#### Scenario: 搜索引擎读取英文文章
- **WHEN** 请求英文文章详情 Metadata
- **THEN** Metadata 包含英文 canonical、中文 alternate、默认社交图片和文章本地化标题

### Requirement: 未匹配路由提供可访问恢复页面
应用 MUST 为未匹配路由提供自定义 not-found 页面，包含明确状态说明和可键盘访问的返回入口。

#### Scenario: 访问不存在路径
- **WHEN** 用户访问没有匹配内容的路由
- **THEN** 返回 404 状态并显示可返回公开首页的恢复操作

### Requirement: 后台不得禁止用户缩放
后台 viewport MUST 允许浏览器和辅助技术缩放，不得声明 `user-scalable=0` 或将 `maximum-scale` 固定为 1。

#### Scenario: 低视力用户缩放后台页面
- **WHEN** 用户使用浏览器缩放后台界面
- **THEN** viewport 配置不阻止缩放

### Requirement: 交互控件在视口与辅助技术下保持可达

页面 SHALL 为独立表单控件和图标操作提供可访问名称，保留可见键盘焦点；移动端和缩放后的视口 SHALL 能到达登录与媒体选择控件。持续装饰运动 SHALL 响应减弱动态偏好并可停止。

#### Scenario: 小屏登录与媒体选择

- **WHEN** 在320或390 CSS像素视口打开登录页或媒体选择器
- **THEN** 面板宽度受视口约束，长内容可滚动且所有操作可聚焦到达

#### Scenario: 图标按钮与表单输入

- **WHEN** 用户以键盘或辅助技术浏览管理行操作、筛选或输入控件
- **THEN** 控件具有明确操作名称/关联标签，聚焦时保留可见指示

### Requirement: 外部编辑器同步不产生用户编辑事件

富文本控件 SHALL 区分外部值重置与用户输入；有效单语展示 SHALL 回退到存在的翻译，不隐藏已有内容。

#### Scenario: 重置表单与单语内容

- **WHEN** 外部表单重置富文本或后台展示只有英文的有效字段
- **THEN** 富文本内容更新但不触发用户onChange，英文内容可见且双语切换仍保留
