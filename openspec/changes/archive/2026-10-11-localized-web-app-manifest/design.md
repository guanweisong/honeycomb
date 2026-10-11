## Context

当前 `src/app/manifest.ts` 在根路径返回固定文案。`cacheComponents` 已启用，构建阶段不能读取生产数据库；博客布局需要让浏览器请求当前语言对应的 Manifest。

## Goals / Non-Goals

**Goals:** 按语言生成站点名称、简称、描述和起始地址；在请求阶段读取公开站点设置。

**Non-Goals:** 根路径兼容入口、异常兜底、其他 PWA 行为调整。

## Decisions

- 将入口放在博客的 `[locale]` 路由下，并由布局链接到 `/${locale}/manifest.webmanifest`。
- 在查询设置前调用 Next.js `connection()`，将数据库读取留到请求阶段；文案缺失时沿用当前 Manifest 的默认文案，不捕获查询异常。
- `start_url` 使用当前语言的首页路径，确保 PWA 从对应语言打开。

## Risks / Trade-offs

- 移除 `/manifest.webmanifest` 后，已安装且仍缓存旧地址的 PWA 可能无法刷新 Manifest；本次按需求不保留根路径入口。

## Migration Plan

更新语言布局中的 Manifest 链接并移除根路径入口，无数据迁移。

## Open Questions

无。
