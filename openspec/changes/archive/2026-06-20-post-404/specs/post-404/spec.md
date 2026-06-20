## ADDED Requirements

### Requirement: 文章详情页在文章缺失时返回 not-found
当请求的博客文章详情路由无法解析到文章时，系统 MUST 返回 not-found 响应。

#### Scenario: 无效的文章 slug
- **WHEN** 用户请求的文章详情路由 slug 与任何已存在文章都不匹配
- **THEN** 系统 MUST 返回 not-found 响应

#### Scenario: 已删除的文章
- **WHEN** 用户请求的文章详情路由对应的文章已删除或不可用
- **THEN** 系统 MUST 返回 not-found 响应

### Requirement: 有效文章仍正常渲染
当请求的文章可以被解析时，系统 MUST 继续正常渲染已存在的博客文章。

#### Scenario: 已存在的文章 slug
- **WHEN** 用户请求的文章详情路由 slug 与已存在文章匹配
- **THEN** 系统 MUST 渲染文章详情页
