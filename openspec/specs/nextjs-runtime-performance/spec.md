# nextjs-runtime-performance Specification

## Purpose
TBD - created by archiving change optimize-nextjs-runtime. Update Purpose after archive.
## Requirements
### Requirement: 等价服务端读取在单次渲染中复用
页面、Metadata、布局和嵌套 Server Component 对相同规范化输入执行的等价公开读取 MUST 在单次渲染中复用同一请求结果，且不得引入独立的跨请求缓存事实源。

#### Scenario: 文章详情同时生成正文和 Metadata
- **WHEN** Next.js 为同一文章参数生成 Metadata 和页面正文
- **THEN** 文章详情 Repository 读取在该次渲染中只执行一次

#### Scenario: 布局和页面同时读取设置及菜单
- **WHEN** Header、Footer、列表正文和 Metadata 读取相同站点设置或菜单
- **THEN** 每种等价读取在该次渲染中只执行一次

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
