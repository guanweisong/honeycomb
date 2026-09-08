## Why

当前公开站点已经采用按需 SSG 与写后失效，但部分公开数据写入没有进入失效闭环，Server Component 与 Metadata 还会重复读取相同数据；同时图片候选尺寸、后台共享客户端依赖、PWA 预缓存、浏览量展示、全局限流和元数据边界仍有可验证的性能与体验缺口。需要在保留现有 URL、数据库结构、权限协议和 ISR 总体策略的前提下，一次收敛这些 Next.js 运行时问题。

## What Changes

- 为所有影响公开页面的写操作建立统一、受限且可测试的缓存失效策略。
- 建立请求级公开查询入口，使页面、布局、Metadata 和嵌套组件复用同一次读取结果。
- 调整 `next/image` 候选尺寸与格式，使头像、图标、缩略图和响应式正文图片命中合理变体。
- 将媒体选择与大型编辑器依赖从后台公共 Provider 下沉到真实消费者，并对大型客户端能力进行路由级或动态加载。
- 缩减 Service Worker 预缓存范围，排除 Manifest 截图、source map 和非离线必需后台资产。
- 将浏览量展示改为动态客户端读取，保持浏览量写入不触发公开页面再生成。
- 为 API 限流增加有界超时、故障隔离与高成本 procedure 的扩展边界。
- 完善后台缩放能力、全局 404、canonical、hreflang、`metadataBase` 和默认 Open Graph 图片。
- 不启用 `cacheComponents`，不修改公开 URL、数据库 schema、权限模型及既有 API 输入输出。

## Capabilities

### New Capabilities

- `nextjs-runtime-performance`: 规范请求级读取复用、响应式图片、客户端依赖装载与 PWA 预缓存预算。
- `public-web-experience`: 规范公开站点和后台的 Metadata、国际化链接、404、缩放与动态浏览量展示。

### Modified Capabilities

- `public-content-freshness`: 将缓存失效覆盖扩大到所有会改变公开渲染或 Metadata 的写操作，并规定浏览量的动态读取语义。
- `admin-content-loading`: 限制后台公共布局只装载所有页面都需要的 Provider 和客户端依赖。
- `api-security-boundaries`: 为全局 API 限流补充超时、故障隔离和 procedure 级扩展要求。

## Impact

- 受影响区域包括公开 App Router 页面与布局、Metadata、公开查询适配器、各 Feature 写入 Router、后台布局与编辑器、Next 图片配置、Serwist、浏览量组件、Proxy/限流基础设施及相关测试。
- 不新增数据库迁移，不改变公开路由和 API 契约，不增加新的运行时依赖。
- 构建与测试需要覆盖 Next.js 16.3.4 的当前缓存模型、Webpack 备用生产构建、架构边界、单元测试和关键 E2E。
