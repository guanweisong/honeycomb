## ADDED Requirements

### Requirement: 布局失效使用完整文件路由

布局失效 MUST 使用包含 route group 的完整文件路由 `/(blog)/[locale]` 和 layout 类型，匹配 Next.js 的隐式布局标签，而非只使用公开 URL 模式。作者资料等公开关联数据写入 MUST 沿既有结构化失效计划刷新依赖详情。

#### Scenario: 更新页面作者资料
- **WHEN** 页面作者的公开名称更新并成功提交布局失效计划
- **THEN** 失效覆盖博客语言布局下的详情缓存，下一次读取可观察到新署名
