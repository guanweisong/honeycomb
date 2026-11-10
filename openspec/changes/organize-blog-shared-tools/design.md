## Context

博客的多语言导航 API 与默认预取策略目前位于 `src/lib/i18n/blog-navigation.ts`，所有运行时消费者均在 `src/app/(blog)`。博客路由组已经有共享 `lib` 目录，可承接只供该路由组使用的导航包装。`useTrackedViews` 虽也由博客组件调用，但它是跨 post/page 的注入式通用 hook，既有类型账本记录其不依赖任一 feature，因此继续留在 `src/lib/hooks`。

`EnableStatus` 由多个 feature、数据库 schema、app 和脚本共同使用，没有自然的单一 feature 所有者。保留现有单一目录比在各 feature 复制值更安全；架构规范需要明确这条窄例外。

## Goals / Non-Goals

**Goals:**

- 让博客专用的导航包装由博客 app 路由组拥有。
- 保留导航接口、默认 `prefetch=true` 和显式 `true` / `false` / `"auto"` / `null` 覆盖行为。
- 将中立 `EnableStatus` 的现有共享归属纳入架构规范。

**Non-Goals:**

- 不改变 URL、locale 路由、链接预取、浏览量请求、认证、业务 API 或数据库。
- 不迁移 `useTrackedViews`，不拆分 `EnableStatus`，不新增 barrel 或依赖。

## Decisions

- 将导航实现和既有单元测试迁至 `src/app/(blog)/lib/blog-navigation.ts` 与同目录测试。该位置只属于博客路由组，不创建 Next.js 路由入口。
- 全量更新博客生产消费者、相关测试 mock 和代码阅读地图，再删除旧 `src/lib/i18n` 路径。保留模块内容与 client/server 导入边界。
- 在 `package-layer-architecture` 的业务概念归属要求中列出 `EnableStatus` 的唯一共享例外，并明确其它 feature 专属目录不适用此例外。

## Risks / Trade-offs

- 旧路径 mock 或文档遗漏会使测试解析错误 → 搜索全仓旧路径，并检查改动 diff。
- `EnableStatus` 例外过宽会鼓励新业务目录进入 lib → 将例外限定到该文件和 `ENABLE` / `DISABLE` 值。
- 预取行为可能因迁移意外变化 → 原样移动实现与既有测试，不改 props 或默认值。
