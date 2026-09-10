## MODIFIED Requirements

### Requirement: 内容写入必须失效对应公开缓存

文章、页面和评论的成功写操作 MUST 由对应 Application Use Case 使受影响的公开内容路径失效，且不得由客户端提供任意缓存路径。其他会改变公开读取结果的分类、菜单、设置、标签和用户写入 Use Case MUST 失效全部受影响公开缓存。Transport MUST 只注入缓存失效端口并调用 Use Case，不得直接决定失效时机或范围。

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
