## ADDED Requirements

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
