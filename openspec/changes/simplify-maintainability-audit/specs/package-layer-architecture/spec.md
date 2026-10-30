## MODIFIED Requirements

### Requirement: 技术依赖不加载业务运行时

以下矩阵是源码运行时依赖方向及技术例外的唯一规范入口；其他规范 SHALL 引用它，并保留各自业务、入口和验证场景。类型引用 MUST 不产生被禁止的运行时依赖。

| 依赖方                       | 允许的职责关系                                                                                                   | 必须拒绝的运行时关系                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| app                          | 组合 feature 的 router/server/admin/public 等具名入口及通用技术/UI                                               | 将业务所有权搬入路由或要求无职责转发层                                            |
| feature                      | 复用目标 feature 的纯契约、有意复用 UI 或 server 具名入口；server 可直接使用 Drizzle/lib                         | 反向导入 app、耦合另一 feature router、浏览器加载 server                          |
| 纯 schema/type/catalog/rules | 复用纯契约和纯技术能力                                                                                           | 直接或间接加载数据库、UI、服务端认证或框架实现                                    |
| components                   | 通用 UI 与显式注入的业务能力                                                                                     | 加载 app 或 feature 业务运行时                                                    |
| lib                          | 技术能力；lib/db 与 lib/auth 可引用 feature 纯 catalog/schema/type；lib/trpc 客户端可 type-only 引用根 AppRouter | 组合业务 router 或加载 feature server；加载应用/UI 运行时（下述会话技术集成除外） |

现有 lib/trpc/context.ts MAY 仅为会话读取延迟导入 src/auth.ts 技术绑定；认证框架组合 MUST 归 app/auth，该窄例外 MUST NOT 扩大为 lib/auth 的业务运行时依赖。

#### Scenario: 执行依赖边界测试

- **WHEN** 新增或修改 lib 或 components 的生产 import
- **THEN** 自动化测试 MUST 追踪直接及间接依赖，允许规定的纯契约或类型引用并拒绝业务运行时加载

#### Scenario: 认证会话技术集成

- **WHEN** tRPC context 读取 Better Auth 会话
- **THEN** 它 MAY 延迟加载 src/auth.ts 技术绑定，但业务 hook 与审计组合 MUST 留在 app/auth，lib/auth MUST 不运行时导入 feature 操作
