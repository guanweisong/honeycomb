# nextjs-runtime-performance Specification

## Purpose

定义公开读取的渲染内复用和跨请求缓存生命周期、Next.js 预渲染与 URL 预取边界，以及响应式图片、后台按需加载和 PWA 预缓存的可验证性能要求。

## Requirements

### Requirement: 等价服务端读取在单次渲染中复用

页面、Metadata、布局和嵌套 Server Component 对相同规范化输入执行的等价公开读取 MUST 在单次渲染中复用同一结果。需要跨请求复用的公开读取 MUST 由 Next.js Cache Components 的显式缓存生命周期和标签管理；React `cache()` SHALL 只负责渲染范围内的去重。缓存层 MUST NOT 缓存用户会话、后台数据或请求专属评论。

#### Scenario: 文章详情同时生成正文和 Metadata

- **WHEN** Next.js 为同一文章参数生成 Metadata 和页面正文
- **THEN** 文章详情读取复用相同的 tagged cache entry，且同次渲染不重复执行底层业务 server 查询

#### Scenario: 布局和页面同时读取设置及菜单

- **WHEN** Header、Footer、列表正文和 Metadata 读取相同站点设置或菜单
- **THEN** 这些消费者复用同一公开缓存条目，并由同一标签负责失效

#### Scenario: 请求时读取评论或后台会话

- **WHEN** 页面读取评论或后台请求身份
- **THEN** 数据只在请求或渲染范围内复用，不进入跨请求共享缓存

### Requirement: 路由默认保留预渲染与链接预取

Next.js 路由和 Server Component MUST 默认保持可预渲染，并保留仓库已定义的 URL 预取行为；构建时可由公开菜单确定的分类列表，以及由当前已发布文章关联关系确定的标签和作者列表 MUST 在构建阶段使用轻量 ID 投影确定 URL、读取列表数据并预渲染首屏。空标签、无公开文章的作者和未枚举分类/标签/作者等动态列表 MAY 在真实请求中解析参数及读取列表数据后再返回。新增 `connection()`、`io()`、请求时 API、动态渲染配置、缓存退出机制或其他会改变预渲染/预取阶段的实现前，MUST 确认语义必要性和目标阶段；MUST NOT 仅为绕过预渲染诊断、方便读取当前时间或生成随机值而引入这些机制。`connection()` 只用于代码确实需要等待真实请求且现有请求时 API 未满足该语义的情形；`io()` 只用于有意将后续同步值或同步 I/O 排除在静态壳之外。需要在按 URL 预取或导航阶段执行的可复用读取 MUST 使用符合当前 Next.js 配置与版本语义的 `prefetch()` 边界；在缓存范围之外，`connection()` 和 `io()` 会把后续工作排除在链接预取之外。

渲染输出需要当前时间或随机值时，实施者 MUST 明确该值应在构建/缓存、URL 预取、导航还是实际请求阶段生成，并按该阶段隔离最小范围；不需要当前时间或随机值的输出 MUST 使用稳定输入。耗时观测 MUST 使用单调时钟（例如 `performance.now()`），不得为计算时长读取 `Date.now()`。无参数 `new Date()`、`Date.now()`、`Math.random()`、`crypto.randomUUID()` 等非确定性读取 MUST NOT 仅为日志、指标或内部请求关联而进入预渲染输出；内部标识 MUST NOT 成为公开内容、URL 参数或公开内容缓存身份。

#### Scenario: 链接预取需要包含目标 URL 内容

- **WHEN** 页面内容按仓库契约应随目标 URL 预取
- **THEN** 实现保留该内容在对应预取阶段的生成与复用，不以 `connection()`、缓存范围外的 `io()` 或等效动态边界排除该内容

#### Scenario: 日志记录耗时

- **WHEN** 服务端中间件或指标适配器只需计算执行耗时
- **THEN** 实现使用单调时钟，并且不因观测而引入当前墙上时间、随机值或请求时动态边界

#### Scenario: 页面确实需要真实请求时值

- **WHEN** 输出语义确实依赖真实请求，且现有请求时 API 尚未提供所需语义
- **THEN** 实现仅将必要代码放在与需求匹配的动态边界内，并保留不依赖该值的可预渲染内容

#### Scenario: 分类列表可在构建时预渲染

- **WHEN** 分类 URL 可从构建时公开菜单中确定
- **THEN** 路由在构建时读取列表并预渲染首屏，同时保留博客共享链接完整 URL 预取及其首屏列表卡片

#### Scenario: 已发布内容的标签与作者列表可在构建时预渲染

- **WHEN** 当前已发布文章关联标签或作者
- **THEN** 路由只用公开 ID 投影生成全部支持语言的列表路径，并在构建时预渲染首屏卡片；空标签和没有已发布文章的用户不因静态枚举生成额外路径

#### Scenario: 空或未枚举列表按请求读取

- **WHEN** 空标签、无公开文章的作者或构建后新增的分类/标签/作者列表 URL 未在构建参数中
- **THEN** 路由在实际请求中解析参数并等待公开列表数据，不为此改变已枚举分类的预渲染策略

### Requirement: 响应式图片必须提供匹配实际布局的候选尺寸

Next.js 图片配置 MUST 同时覆盖固定小图、移动端内容图和桌面内容图，并 SHALL 提供 AVIF 与 WebP 输出；图片消费者的 `sizes` MUST 与实际 CSS 布局一致。

#### Scenario: 渲染评论头像

- **WHEN** 页面渲染 48px 评论头像
- **THEN** Next.js 候选尺寸包含接近 48px 与双倍像素密度的宽度，不要求使用 960px 变体

#### Scenario: 渲染响应式文章封面

- **WHEN** 文章封面在移动端约 320px、桌面端约 846px 显示
- **THEN** 浏览器可从 AVIF 或 WebP srcset 选择匹配视口的候选宽度

### Requirement: 后台大型客户端能力按真实消费者装载

后台公共布局 MUST NOT 装载仅供文章或页面编辑使用的媒体选择器、Tiptap 编辑器、图表或可排序树实现；大型客户端能力 SHALL 在所属路由或交互边界延迟加载。

#### Scenario: 打开后台评论页

- **WHEN** 用户访问不含富文本编辑器的后台评论页
- **THEN** 初始客户端依赖不包含 Tiptap/ProseMirror 编辑器 chunk

#### Scenario: 打开内容编辑页

- **WHEN** 用户访问文章或页面编辑页
- **THEN** 编辑器与媒体选择能力加载后保持既有编辑和选图行为

### Requirement: Service Worker 预缓存保持必要且有界

PWA 构建 MUST 排除 Manifest screenshots、source map、非离线必需后台资产和其他已识别的大体积非关键资源，同时 MUST 保留离线文档、应用图标和公开站点核心资源。

#### Scenario: 生成 Service Worker

- **WHEN** 生产构建生成预缓存清单
- **THEN** 清单不包含桌面或移动端截图及 source map，并仍包含离线入口
