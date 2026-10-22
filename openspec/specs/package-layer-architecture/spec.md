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

用户、内容、菜单等业务状态、类型、schema 和选项 MUST 归属相应 feature；通用国际化、数据库、认证、缓存和存储等技术能力 SHALL 位于 lib。

#### Scenario: 引用文章状态

- **WHEN** 数据库、router 或 UI 需要文章状态
- **THEN** 它们 SHALL 复用 post feature 拥有的同一纯目录，不建立共享 domain 或 contracts 副本

### Requirement: 技术依赖不加载业务运行时

lib MUST NOT 承担业务 router 组合或直接加载 feature server 操作。lib/db 与 lib/auth MAY 引用 feature 纯 catalog/schema/type；lib/trpc 客户端 MAY type-only 引用根 AppRouter。通用 components MUST 不运行时依赖 app 或 feature。现有 lib/trpc/context.ts MAY 仅为会话读取延迟导入 src/auth.ts 技术绑定，其认证框架组合归 app/_auth；该窄例外不得扩大为 lib/auth 的运行时业务依赖。

#### Scenario: 执行依赖边界测试

- **WHEN** 新增或修改 lib 或 components 的生产 import
- **THEN** 自动化测试 MUST 追踪直接及间接依赖，允许规定的纯契约或类型引用并拒绝业务运行时加载

#### Scenario: 认证会话技术集成

- **WHEN** tRPC context 读取 Better Auth 会话
- **THEN** 它 MAY 延迟加载 src/auth.ts 技术绑定，但业务 hook 与审计组合 MUST 留在 app/_auth，lib/auth MUST 不运行时导入 feature 操作

### Requirement: 浏览器认证绑定归属技术库

共享 Better Auth 浏览器客户端 MUST 位于 src/lib/auth/client.ts，保留 use client 指令、现有插件顺序和单实例。MUST NOT 保留 src/auth-client.ts 兼容转出口，也不得为此次迁移移动 src/auth.ts 或 Next.js 根入口。

#### Scenario: 检查客户端认证入口

- **WHEN** 运行目录和浏览器依赖门禁
- **THEN** 新文件 MUST 存在、旧文件 MUST 不存在，且新文件 MUST 纳入既有直接及间接客户端依赖检查
