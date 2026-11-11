## ADDED Requirements

### Requirement: 文章和页面正文包含在链接预取中

博客文章与页面详情链接使用完整预取时，目标 URL 的预取结果 MUST 包含该 ID 对应的公开正文详情。评论、推荐和友情链接等请求时数据 MAY 保持在独立 Suspense fallback 后，不得阻塞正文预取。后台私有数据 MUST NOT 进入此公开缓存。

#### Scenario: 从列表预取文章
- **WHEN** 生产环境的文章链接进入视口且预取在点击前完成
- **THEN** 对应 RSC 预取响应包含文章正文，点击时直接复用该详情

#### Scenario: 从菜单预取独立页面
- **WHEN** 生产环境的页面链接进入视口且预取在点击前完成
- **THEN** 对应 RSC 预取响应包含页面正文，动态友情链接或评论可继续显示自己的 fallback

#### Scenario: 评论读取等待时仍可发表留言
- **WHEN** 文章或独立页面的请求时评论读取仍在等待
- **THEN** 发表留言表单先行渲染，评论列表在自己的 Suspense fallback 后加载，回复按钮仍可定位并更新该表单

#### Scenario: 同筛选条件接收更新的 Blog 列表首屏
- **WHEN** 客户端已有同一筛选条件的列表缓存，且路由收到更新的服务端首屏列表
- **THEN** TanStack Query 在稳定的列表 query key 下应用较新的 hydration 数据，不依赖每请求 UUID 区分 query key
