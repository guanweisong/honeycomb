## Why

当前 Web App Manifest 的名称和描述是固定的，与用户正在浏览的语言不一致。让 Manifest 使用该语言对应的站点设置，保持 PWA 信息与页面语言一致。

## What Changes

- 为每个受支持的语言提供独立 Manifest，名称、简称和描述读取对应语言的站点设置。
- 博客布局链接到当前语言的 Manifest；**BREAKING** 移除根路径 Manifest。
- Manifest 在请求时读取设置，避免构建阶段访问数据库。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `pwa-offline-reliability`：Manifest 名称、描述和起始地址按当前语言生成。

## Impact

- 影响博客语言路由下的 Manifest、博客布局和现有 PWA 规格。
