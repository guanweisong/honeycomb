## Why

博客的多语言导航包装包含博客链接的预取策略，却位于通用 `lib/i18n`；按实际消费者归属可让博客交互规则更容易定位。与此同时，架构规范把业务状态归 Feature，但当前被数据库、多个 Feature 和后台共同使用的 `EnableStatus` 是明确的中立共享目录，需要在规范中记录这个窄例外。

## What Changes

- 将博客导航包装及其现有测试迁入博客 App 路由组，更新全部生产消费者和测试 mock，保持默认预取策略及显式覆盖行为不变。
- 保留跨 post/page 且通过注入 mutation 适配的 `useTrackedViews` 在 `lib/hooks`，不为归属调整引入 Feature 依赖。
- 在源码架构规范中明确 `EnableStatus` 的共享目录例外；其它业务状态仍由所属 Feature 持有。
- 更新代码阅读地图和 `EnableStatus` 注释，删除旧导航模块路径。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `package-layer-architecture`：明确中立 `EnableStatus` 共享目录例外，同时维持其它业务状态的 Feature 所有权。

## Impact

- 受影响源码：`src/lib/i18n/blog-navigation.ts`、其测试、博客 App 路由组的导航消费者，以及 `src/lib/validation/enable-status.ts` 注释。
- 受影响文档：源码架构规范及 `docs/code-reading-map.md`。
- 不改变 URL、导航参数、预取行为、浏览量上报时序、API、数据库结构或依赖。
