## Why

`src/features` 同时承载业务规则和浏览器界面，导致业务模块与 Next.js 路由、渲染和客户端交互边界混在一起。将浏览器 UI 归到 `src/app`，让 feature 聚焦业务契约与操作，让 app 路由负责页面组合。

## What Changes

- **BREAKING**：`src/features` 不再存放浏览器页面、React 展示组件、客户端交互 hook、tRPC 客户端 action/query、表格列等展示实现；按后台路由或博客路由迁入 `src/app`。
- 保留 feature 的 server 操作、规则、schema、业务类型和非 UI 转换；app 通过现有具名入口组合业务能力。
- 同步生产 import、动态加载、测试/mock、路径断言、目录扫描门禁和当前架构说明，不保留旧路径转出口。
- 不改变 URL、页面内容、权限、数据流、保存/恢复、媒体注入、缓存或副作用语义；通知邮件模板仍属于邮件通知，不属于浏览器路由 UI。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `package-layer-architecture`：浏览器 UI 归 app；feature 不得包含或反向依赖 app 的 UI。
- `feature-business-boundaries`：feature 拥有业务契约与服务端实现，浏览器 UI 与交互由 app 路由拥有。
- `feature-module-contract`：明确 app 组合 feature 业务入口，feature 模块不再拥有页面和 UI。

## Impact

涉及 `src/features/**` 中的浏览器 UI 与其测试、`src/app/**` 路由和路由组拥有的组件目录、静态/动态消费者、架构门禁及当前文档。无 API、数据库结构、依赖或公开 URL 变更。
