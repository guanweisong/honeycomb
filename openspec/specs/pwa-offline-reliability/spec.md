# pwa-offline-reliability Specification

## Purpose
TBD - created by archiving change close-engineering-production-loops. Update Purpose after archive.
## Requirements
### Requirement: 离线文档必须进入预缓存
系统 MUST 将配置为文档导航 fallback 的 `/en/offline` 显式加入生成 Service Worker 的 precache 清单，不得依赖运行时首次访问或构建器的偶然发现。

#### Scenario: 生成生产 Service Worker
- **WHEN** 工程完成生产构建并生成 `/serwist/sw.js`
- **THEN** 生成清单包含 `/en/offline`，且 fallback 配置引用相同 URL

### Requirement: 失败导航必须返回离线页面
Service Worker 控制页面后，系统 SHALL 在网络不可用且目标文档没有可用缓存时返回预缓存离线页面。

#### Scenario: 浏览器断网后访问未缓存地址
- **WHEN** Chromium 已被 `/serwist/sw.js` 控制并在离线状态导航到未缓存的 Blog 文档地址
- **THEN** 导航成功呈现包含离线提示和重试按钮的 fallback，而不是返回网络错误

### Requirement: 只保留单一 Service Worker 实现
工程 MUST 以 `src/app/sw.ts` 和 `/serwist/sw.js` 为唯一 Service Worker 实现，并 MUST NOT 在 `public` 保留旧 `sw.js`、source map 或 `workbox-*` 资产。

#### Scenario: 扫描公共静态资产
- **WHEN** 运行 PWA 架构门禁
- **THEN** `public` 中不存在旧 Service Worker 和 Workbox 文件，生成 precache 也不包含这些遗留项
