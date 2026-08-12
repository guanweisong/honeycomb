## Why

当前 `packages` 顶层按一次次重构结果增加了多个很小的目录，`domain` 也只承载了少量被动迁出的类型。目录无法直接表达系统的业务层、应用层和技术实现层，新增代码容易继续落入 tRPC 或新的顶层小包。

## What Changes

- 将顶层包收敛为 `domain`、`identity`、`application`、`infrastructure`、`trpc` 和 `ui` 六个稳定层级。
- 将认证与账号安全归入 identity，评论通知归入 application，数据库、HTTP、可观测性和安全归入 infrastructure。
- 将文章、页面、评论、菜单、标签、国际化和启用状态等稳定业务概念从 tRPC 提升到分领域的 domain 模块。
- 保留 tRPC 的 Router、输入 schema、procedure 输出和传输专属筛选枚举，避免将 API 契约误作领域模型。
- 用自动化边界测试限制顶层目录和依赖方向。

## Capabilities

### New Capabilities

- `package-layer-architecture`: 定义六层 packages 目录、领域模型归属和允许的依赖方向。

### Modified Capabilities

- `package-layer-cleanup`: 将现有共享 UI、通知和 tRPC 边界要求纳入六层包架构。

## Impact

- 影响所有 `src/packages` 顶层目录及其引用路径，以及 App Router 对领域枚举的引用。
- 不改变公开 URL、数据库结构、tRPC procedure、认证规则或用户可见行为。
