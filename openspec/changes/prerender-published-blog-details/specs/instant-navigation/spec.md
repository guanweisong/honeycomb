## MODIFIED Requirements

### Requirement: 动态语言和内容参数无需完整构建时枚举

根 `[locale]` 和列表 slug MUST NOT 依赖 `generateStaticParams()` 枚举完整参数。文章归档 ID 与独立页面 ID MAY 使用 `generateStaticParams()` 预生成构建时已发布内容的路径；该枚举 MUST 使用已发布内容的轻量 ID 投影，并生成全部支持语言的路径。文章和页面详情路由 MUST NOT 将完整 ID 枚举作为路由正确性的前提；构建后新增或未枚举的 ID MUST 仍可在运行时解析。空内容时，生成器 MUST 按 Cache Components 非空参数要求返回不会暴露内容的无效占位 ID，并由既有 ID 校验处理为 not-found。页面 MUST 在需要运行时解析参数或数据时保留局部 Suspense 边界，使共享静态页面外壳可复用。

#### Scenario: 构建当前已发布详情路径

- **WHEN** Next.js 构建应用且数据库包含已发布文章或独立页面
- **THEN** 每个已发布 ID 都为全部支持语言生成详情路径，并使用原有公开详情读取生成页面内容

#### Scenario: 构建后访问新增详情 ID

- **WHEN** 访客访问未在构建参数中列出的文章或页面 ID
- **THEN** 路由仍在运行时解析该 ID，并在既有局部 fallback 后呈现公开内容或 not-found

#### Scenario: 构建时没有已发布详情

- **WHEN** Next.js 构建应用且没有已发布文章或独立页面
- **THEN** 生成器提供无效占位 ID 以满足非空参数要求，详情路由由既有 ID 校验返回 not-found
