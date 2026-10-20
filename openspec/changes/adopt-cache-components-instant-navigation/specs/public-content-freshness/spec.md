## ADDED Requirements

### Requirement: 结构化失效会使 Cache Components 标签过期

除现有 Upstash 版本更新和路径失效外，已有的结构化失效计划 MUST 使对应的 Cache Components 标签过期。该计划 MUST 保留既有失效顺序、重试次数上限和非致命降级结果行为；客户端 MUST NOT 提供任意缓存标签、键或路径。

#### Scenario: 更新文章详情

- **WHEN** 文章 server 操作成功更新指定文章，并提交包含该 ID 的结构化失效计划
- **THEN** 对应文章详情标签和各语言路径失效，下一次正文或 Metadata 读取能获取新内容

#### Scenario: 更新文章索引

- **WHEN** 结构化计划请求刷新文章索引
- **THEN** 基础设施先递增现有 Upstash 版本并立即使 Next.js 文章索引标签过期，再按既有顺序处理 sitemap、详情和布局范围

#### Scenario: 更新共享公开布局数据

- **WHEN** 结构化计划请求刷新布局
- **THEN** 设置、菜单和友情链接的共享公开标签失效，所有语言的布局及依赖这些数据的公开导航在下一次读取时能获取新值
