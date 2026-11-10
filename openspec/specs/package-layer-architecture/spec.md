# 简单源码架构

## Purpose

以 app、features、components、lib 四种职责替代未发布的 packages 层级，让业务归属可搜索、技术能力可复用，并保持真实运行时与授权边界。

## Requirements

### Requirement: 源码采用四种职责目录

系统 MUST 使用 app 负责路由、布局、HTTP 与框架组合，features 负责业务，components 负责通用 UI/编辑器，lib 负责技术能力；MUST NOT 保留 src/packages 或人工 feature application/domain/infrastructure 分层。

#### Scenario: 检查源码目录

- **WHEN** 执行架构边界测试
- **THEN** 测试 MUST 拒绝旧 packages 和人工 feature 分层目录，不要求每个 feature 建立全部可选文件

### Requirement: 业务概念归属于 Feature

用户、内容、菜单等业务状态、类型、schema 和选项 MUST 归属相应 feature。跨多个 feature 且没有唯一业务 feature 所有者的启用开关目录 `EnableStatus` MAY 保留在 `src/lib/validation/enable-status.ts`，作为唯一的 `ENABLE` / `DISABLE` 定义；此例外 MUST NOT 扩展到 feature 专属状态、类型、schema 或选项。通用国际化、数据库、认证、缓存和存储等技术能力 SHALL 位于 lib。

#### Scenario: 引用文章状态

- **WHEN** 数据库、router 或 UI 需要文章状态
- **THEN** 它们 SHALL 复用 post feature 拥有的同一纯目录，不建立共享 domain 或 contracts 副本

#### Scenario: 复用中立启用开关

- **WHEN** Category、Link、Menu、Post 评论开关、Comment 或数据库 schema 需要通用启用/禁用值
- **THEN** 它们 SHALL 复用 `src/lib/validation/enable-status.ts` 中唯一的 `EnableStatus` 定义；Post、Page、Comment、User 等 feature 专属状态仍 MUST 由各自 feature 持有

### Requirement: 技术依赖不加载业务运行时

以下矩阵是源码运行时依赖方向及技术例外的唯一规范入口；其他规范 SHALL 引用它，并保留各自业务、入口和验证场景。类型引用 MUST 不产生被禁止的运行时依赖。

| 依赖方                       | 允许的职责关系                                                                                                   | 必须拒绝的运行时关系                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| app                          | 组合 feature 的 router、server 操作或纯契约，以及通用技术与 UI                                                   | 将业务所有权搬入路由或要求无职责转发层                                            |
| feature                      | 复用目标 feature 的纯契约或具名 server 操作，server 可直接使用 Drizzle/lib                                       | 导入业务 UI、反向导入 app、耦合另一 feature router、浏览器加载 server             |
| 纯 schema/type/catalog/rules | 复用纯契约和纯技术能力                                                                                           | 直接或间接加载数据库、UI、服务端认证或框架实现                                    |
| components                   | 通用 UI 与显式注入的业务能力                                                                                     | 加载 app 或 feature 业务运行时                                                    |
| lib                          | 技术能力；lib/db 与 lib/auth 可引用 feature 纯 catalog/schema/type；lib/trpc 客户端可 type-only 引用根 AppRouter | 组合业务 router 或加载 feature server；加载应用/UI 运行时（下述会话技术集成除外） |

现有 lib/trpc/context.ts MAY 仅为会话读取延迟导入 src/auth.ts 技术绑定；认证框架组合 MUST 归 app/auth，该窄例外 MUST NOT 扩大为 lib/auth 的业务运行时依赖。业务浏览器页面、展示组件、交互 hook 和客户端 action/query MUST 归 app 路由或路由组，新增的路由专属展示配置也归 app。共置的 `components` 目录不得包含 App Router 入口文件，feature 的纯业务目录和通知邮件模板仍归其业务。

#### Scenario: 执行依赖边界测试

- **WHEN** 新增或修改 lib、components 或 feature 的生产 import
- **THEN** 自动化测试 MUST 追踪直接及间接依赖，允许规定的纯契约或类型引用并拒绝违规运行时加载。目录门禁 MUST 拒绝 feature 内的浏览器 UI，允许归属通知邮件的模板。

#### Scenario: 认证会话技术集成

- **WHEN** tRPC context 读取 Better Auth 会话
- **THEN** 它 MAY 延迟加载 src/auth.ts 技术绑定，但业务 hook 与审计组合 MUST 留在 app/auth，lib/auth MUST 不运行时导入 feature 操作

### Requirement: 浏览器认证绑定归属技术库

共享 Better Auth 浏览器客户端 MUST 位于 src/lib/auth/client.ts，保留 use client 指令、现有插件顺序和单实例。MUST NOT 保留 src/auth-client.ts 兼容转出口，也不得为此次迁移移动 src/auth.ts 或 Next.js 根入口。

#### Scenario: 检查客户端认证入口

- **WHEN** 运行目录和浏览器依赖门禁
- **THEN** 新文件 MUST 存在、旧文件 MUST 不存在，且新文件 MUST 纳入既有直接及间接客户端依赖检查

### Requirement: 站点专属运行时入口归所属路由组

站点专属的 Next.js metadata 路由、其数据实现以及非框架发现的站点运行时源码 MUST 归属对应站点的 App 路由组。route group 不得被视为 URL 命名空间；同一 App Router 中每个公开 URL MUST 只有一个路由所有者。多个站点需要共用根 metadata URL 时，系统 MUST 由单一入口按 host 分发，或将站点拆分为独立应用/部署。

#### Scenario: 增加站点专属 sitemap 与 worker

- **WHEN** 新站点增加 sitemap/robots 生成逻辑或显式构建的 Service Worker
- **THEN** 实现 MUST 放在该站点路由组内，且构建与框架入口继续指向同一实现

#### Scenario: 两个站点申请相同根路径

- **WHEN** 同一 App Router 中的多个站点都需要 `/robots.txt` 或 `/sitemap.xml`
- **THEN** 工程 MUST 通过唯一的 host 分发入口或独立应用/部署解决归属，MUST NOT 仅靠不同 route group 注册重复路径
