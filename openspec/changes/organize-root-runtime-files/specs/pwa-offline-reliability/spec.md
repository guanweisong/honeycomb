> 当前路径由[站点运行时归属变更](../../../align-site-runtime-ownership/specs/pwa-offline-reliability/spec.md)更新为 `src/app/(blog)/pwa/sw.ts`；下方要求保留原有行为契约。

## MODIFIED Requirements

### Requirement: 只保留单一 Service Worker 实现

工程 MUST 以 `src/app/pwa/sw.ts` 和 `/serwist/sw.js` 为唯一 Service Worker 实现，并 MUST NOT 在 `public` 保留旧 `sw.js`、source map 或 `workbox-*` 资产。

#### Scenario: 扫描公共静态资产

- **WHEN** 运行 PWA 架构门禁
- **THEN** `public` 中不存在旧 Service Worker 和 Workbox 文件，生成 precache 也不包含这些遗留项
