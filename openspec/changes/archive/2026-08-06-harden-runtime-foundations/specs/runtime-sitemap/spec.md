## ADDED Requirements

### Requirement: 构建不依赖 sitemap 数据库查询
系统 MUST 在生产构建期间不访问数据库生成动态 sitemap 内容。

#### Scenario: 数据库不可访问时构建
- **WHEN** 生产构建环境无法连接 Turso
- **THEN** sitemap 不发起数据库请求且构建可继续完成

### Requirement: Sitemap 运行时生成并缓存
系统 SHALL 在运行时读取已发布的菜单、文章和页面，并对生成结果使用明确的缓存周期。

#### Scenario: 运行时数据可用
- **WHEN** 搜索引擎请求 sitemap 且数据库查询成功
- **THEN** 响应包含静态 URL 和全部符合条件的动态 URL

#### Scenario: 缓存结果可复用
- **WHEN** 缓存周期内重复请求相同 sitemap 分片
- **THEN** 系统复用缓存结果而不重复执行完整数据库读取

### Requirement: Sitemap 查询失败时安全降级
系统 MUST 在动态数据查询失败时返回有效的静态 sitemap，并 MUST NOT 因该失败返回无效 XML 或泄露内部错误。

#### Scenario: 运行时数据库失败
- **WHEN** sitemap 的菜单、文章或页面查询失败
- **THEN** 系统返回首页和固定分类 URL，并将失败交给服务端错误报告入口

### Requirement: Sitemap 支持内容分片
系统 SHALL 在动态内容超过单次查询或单文件容量时生成可发现的 sitemap 分片，且 MUST NOT 静默截断超过 1000 条的内容。

#### Scenario: 文章超过单页限制
- **WHEN** 已发布文章数量超过单个查询批次
- **THEN** 系统生成后续分片并使全部已发布文章 URL 可被发现
