## ADDED Requirements

### Requirement: 站点专属运行时入口归所属路由组

站点专属的 Next.js metadata 路由、其数据实现以及非框架发现的站点运行时源码 MUST 归属对应站点的 App 路由组。route group 不得被视为 URL 命名空间；同一 App Router 中每个公开 URL MUST 只有一个路由所有者。多个站点需要共用根 metadata URL 时，系统 MUST 由单一入口按 host 分发，或将站点拆分为独立应用/部署。

#### Scenario: 增加站点专属 sitemap 与 worker

- **WHEN** 新站点增加 sitemap/robots 生成逻辑或显式构建的 Service Worker
- **THEN** 实现 MUST 放在该站点路由组内，且构建与框架入口继续指向同一实现

#### Scenario: 两个站点申请相同根路径

- **WHEN** 同一 App Router 中的多个站点都需要 `/robots.txt` 或 `/sitemap.xml`
- **THEN** 工程 MUST 通过唯一的 host 分发入口或独立应用/部署解决归属，MUST NOT 仅靠不同 route group 注册重复路径
