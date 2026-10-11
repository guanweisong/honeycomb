# 即时导航 Specification

## Purpose

定义公开博客与后台路由在客户端导航时提供即时页面外壳、按需执行请求时检查，以及完整预取博客内容的行为。

## Requirements

### Requirement: 每个面向用户的 App Router 目标都提供即时且安全的页面外壳

所有可通过客户端导航访问的公开博客和后台路由 MUST 渲染静态或缓存的页面外壳，以便导航时立即显示。请求时 API、依赖路由的未缓存读取和授权检查 MUST 放在路由局部的 Suspense 边界后。应用 MUST NOT 使用 `instant = false` 让路由避开即时导航验证。fallback MUST NOT 暴露后台私有内容或绕过授权。

#### Scenario: 导航到未在构建时列出的公开内容 ID

- **WHEN** 访客跟随链接访问构建时未生成的文章或页面 ID
- **THEN** 共享公开页面外壳和路由 fallback 立即显示，URL 专属内容准备好后流入对应边界

#### Scenario: 后台页面的请求级检查尚未完成

- **WHEN** 后台目标页面在导航期间需要执行会话或能力检查
- **THEN** 检查访问权限期间显示不含敏感信息的 fallback，只有授权成功后才渲染受保护页面内容

#### Scenario: 当前用户没有访问后台目标页面的能力

- **WHEN** 请求级路由检查发现已认证用户无权访问目标页面
- **THEN** 使用现有的禁止访问重定向或页面，目标页面的受保护内容不得出现在页面外壳或 fallback 中

### Requirement: 博客站内链接完整预取目标内容

博客前台所有指向站内路由的 `<Link>` MUST 显式或通过统一封装使用 `prefetch={true}`，以便目标链接可见时预取目标 URL 的缓存内容。博客直接使用 `next/link` 的组件也 MUST 使用 `true`。后台链接 MUST 保留 `auto` 行为，且 MUST NOT 强制完整预取 URL 专属的认证内容。

#### Scenario: 博客站内链接进入视口

- **WHEN** 生产环境中的博客站内链接变为可见
- **THEN** Next.js 预取目标 URL 的缓存内容，以便点击时即时导航

#### Scenario: 后台菜单链接进入视口

- **WHEN** 已认证用户看到后台菜单链接
- **THEN** 链接按 `auto` 策略预取页面外壳，不会强制完整预取私有路由数据

### Requirement: 动态语言和内容参数无需构建时枚举

根 `[locale]`、归档 ID、页面 ID 和列表 slug MUST NOT 依赖 `generateStaticParams()` 枚举参数。页面 MUST 在请求时解析这些参数，并将阻塞的参数读取放在局部 Suspense 边界内，使静态页面外壳可复用。

#### Scenario: 使用 Cache Components 构建本地化路由

- **WHEN** Next.js 构建应用
- **THEN** locale 与动态内容路由在不枚举参数的情况下构建可复用页面外壳，访问时再解析具体参数值
