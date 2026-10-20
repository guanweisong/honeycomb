## MODIFIED Requirements

### Requirement: 等价服务端读取在单次渲染中复用

页面、Metadata、布局和嵌套 Server Component 对相同规范化输入执行的等价公开读取 MUST 在单次渲染中复用同一结果。需要跨请求复用的公开读取 MUST 由 Next.js Cache Components 的显式缓存生命周期和标签管理；React `cache()` SHALL 只负责渲染范围内的去重。缓存层 MUST NOT 缓存用户会话、后台数据或请求专属评论。

#### Scenario: 文章详情同时生成正文和 Metadata

- **WHEN** Next.js 为同一文章参数生成 Metadata 和页面正文
- **THEN** 文章详情读取复用相同的 tagged cache entry，且同次渲染不重复执行底层业务 server 查询

#### Scenario: 布局和页面同时读取设置及菜单

- **WHEN** 页头、页脚、列表正文和 Metadata 读取相同公开设置或菜单
- **THEN** 这些消费者复用同一公开缓存条目，并由同一标签负责失效

#### Scenario: 请求时读取评论或后台会话

- **WHEN** 页面读取评论或后台请求身份
- **THEN** 数据只在请求或渲染范围内复用，不进入跨请求共享缓存
