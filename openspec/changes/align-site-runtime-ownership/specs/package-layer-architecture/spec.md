## ADDED Requirements

### Requirement: 站点专属运行时实现归属其站点

站点专属的数据实现以及非框架发现的站点运行时源码 MUST 归属对应站点的 App 路由组。Next.js metadata 入口 MUST 遵守其实际文件路由语义；如果放入 route group 会改变固定公开文件名，入口 MUST 留在 App 根目录并委托给站点实现。route group 不得被视为 URL 命名空间；同一 App Router 中每个公开 URL MUST 只有一个路由所有者。多个站点需要共用根 metadata URL 时，系统 MUST 由单一入口按 host 分发，或将站点拆分为独立应用/部署。

#### Scenario: 增加站点专属 sitemap 与 worker

- **WHEN** 新站点增加 sitemap 入口或显式构建的 Service Worker
- **THEN** 实现 MUST 放在该站点路由组内，且构建与框架入口继续指向同一实现

#### Scenario: 固定 robots 文件名

- **WHEN** 站点需要 Next.js 生成固定路径 `/robots.txt`
- **THEN** `robots.ts` MUST 位于 `src/app` 根目录，符合 Next.js robots 文件约定；入口 MAY 调用站点路由组中的实现

#### Scenario: 两个站点申请相同根路径

- **WHEN** 同一 App Router 中的多个站点都需要 `/robots.txt` 或 `/sitemap.xml`
- **THEN** 工程 MUST 通过唯一的 host 分发入口或独立应用/部署解决归属，MUST NOT 仅靠不同 route group 注册重复路径
