## MODIFIED Requirements

### Requirement: 内容写入必须失效对应公开缓存

文章、页面和评论的成功写操作 MUST 由对应 Application Use Case 通过一次结构化计划使受影响的公开内容缓存失效，且不得由客户端提供任意缓存路径或缓存 key。其他会改变公开读取结果的分类、友情链接、菜单、设置、标签、用户和媒体写入 Use Case MUST 失效全部受影响公开缓存。Transport MUST 只注入缓存失效端口并调用 Use Case，不得直接决定失效时机或范围。

#### Scenario: 后台修改友情链接

- **WHEN** 创建、更新或删除会在友情链接页面公开展示的链接
- **THEN** 对应 Link Use Case MUST 在持久化成功后失效全部公开内容缓存

#### Scenario: 后台更新已发布文章

- **WHEN** 更新操作成功持久化
- **THEN** 对应 Use Case MUST 失效各语言文章详情缓存，下一次读取可观察到新内容

#### Scenario: 写入失败

- **WHEN** Repository 写入失败
- **THEN** Use Case MUST 返回原始失败且不得调用缓存失效端口

#### Scenario: 从其他入口复用写入

- **WHEN** Server Action、后台任务或测试调用与 tRPC 相同的写入 Use Case
- **THEN** 它 MUST 获得与 tRPC 入口相同的缓存失效行为，而无需复制失效调用

#### Scenario: 缓存失效失败

- **WHEN** 数据库写入成功但同步缓存失效失败
- **THEN** Use Case MUST 保持当前失败传播语义，不得伪造回滚或静默报告全部步骤成功

#### Scenario: 关联快照发生变化

- **WHEN** 分类、标签、用户或媒体删除成功改变文章列表中缓存的关联数据
- **THEN** 对应 Use Case MUST 在同一次失效计划中请求刷新公开布局并提升文章索引缓存版本

#### Scenario: sitemap 数据发生变化

- **WHEN** 文章、页面、菜单或被菜单引用的分类写入成功改变 sitemap URL、分片数量、可见性或更新时间
- **THEN** 对应 Use Case MUST 请求立即过期 sitemap 缓存，且下一次读取不得返回旧数据

#### Scenario: 多层缓存按依赖顺序失效

- **WHEN** 同一次计划同时影响文章索引、sitemap 数据缓存和公开路由缓存
- **THEN** Infrastructure MUST 先提升文章索引版本，再过期 sitemap tag，最后失效详情与布局路由，避免路由在内层旧缓存仍可见时重新生成

#### Scenario: 媒体删除重试修复缓存

- **WHEN** 媒体记录已删除但上一次同步缓存失效失败，调用方使用相同非空 ID 集合重试
- **THEN** Media Use Case MUST 跳过已不存在的对象与记录，并再次执行幂等公开缓存失效

#### Scenario: 空失效计划

- **WHEN** 调用方提交不包含任何详情引用或启用范围的缓存失效计划
- **THEN** 共享 Application 契约 MUST 拒绝该计划，不得静默报告无操作成功

#### Scenario: 批量删除公开内容

- **WHEN** 一次操作删除多个文章或页面
- **THEN** 对应 Use Case MUST 在一次失效计划中包含全部详情引用，并且每种共享缓存范围最多执行一次

#### Scenario: 首次提升文章索引缓存版本

- **WHEN** 缓存版本键尚不存在且读取使用隐式默认版本
- **THEN** 第一次失效 MUST 将版本推进到不同于隐式默认值的版本，后续读取不得继续命中旧默认版本缓存
