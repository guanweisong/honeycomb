# pwa-offline-reliability Specification

## Purpose
确保文档离线回退被显式预缓存并可在真实断网下使用，统一 Service Worker 实现与语言化 manifest 的请求时行为。
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
工程 MUST 以 `src/app/pwa/sw.ts` 和 `/serwist/sw.js` 为唯一 Service Worker 实现，并 MUST NOT 在 `public` 保留旧 `sw.js`、source map 或 `workbox-*` 资产。

#### Scenario: 扫描公共静态资产
- **WHEN** 运行 PWA 架构门禁
- **THEN** `public` 中不存在旧 Service Worker 和 Workbox 文件，生成 precache 也不包含这些遗留项

### Requirement: Web App Manifest 按当前语言生成
系统 MUST 为每个受支持的语言提供 `/{locale}/manifest.webmanifest`，且 MUST NOT 保留根路径 `/manifest.webmanifest` 入口。Manifest 的 `name`、`short_name` 和 `description` SHALL 使用该语言的站点设置，设置缺失时沿用当前默认文案；`start_url` SHALL 指向该语言的首页。生成 Manifest 时 MUST 在请求阶段读取站点设置，构建阶段不得依赖生产数据库连接。

#### Scenario: 请求中文 Manifest
- **WHEN** 浏览器请求 `/zh/manifest.webmanifest`
- **THEN** 返回的名称和描述使用中文站点设置，起始地址为 `/zh/`

#### Scenario: 请求英文 Manifest
- **WHEN** 浏览器请求 `/en/manifest.webmanifest`
- **THEN** 返回的名称和描述使用英文站点设置，起始地址为 `/en/`

#### Scenario: 构建时没有生产数据库连接
- **WHEN** 在无法连接生产数据库的构建环境中构建应用
- **THEN** 构建过程不读取站点设置，Manifest 请求时才读取设置

#### Scenario: 访问根路径 Manifest
- **WHEN** 浏览器请求 `/manifest.webmanifest`
- **THEN** 系统不提供该根路径入口
