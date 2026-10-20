# Honeycomb

<div align="center">

一个基于 Next.js 16 + tRPC + Drizzle ORM 构建的现代化 Serverless 全栈 CMS 系统，实现了端到端类型安全。

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

## 特性

- **现代化技术栈** - Next.js 16 + React 19 + TypeScript 6.0
- **端到端类型安全** - tRPC + Drizzle ORM + Zod 实现全栈类型推断
- **国际化支持** - 基于 next-intl 的多语言支持
- **现代化 UI** - shadcn/ui + Radix UI + Tailwind CSS 4
- **富文本编辑** - Tiptap 编辑器，支持图片、链接、高亮等
- **权限管理** - 集中式角色到 capability 映射（ADMIN/EDITOR/GUEST）
- **PWA 支持** - Serwist 提供离线能力
- **Serverless 架构** - 完全无服务器部署
- **现代化数据库** - Turso (LibSQL) 高性能 SQLite
- **邮件通知** - Resend 邮件服务集成
- **对象存储** - Cloudflare R2 / AWS S3 支持
- **验证码** - Cloudflare Turnstile 行为验证

## 技术架构

### 核心框架

- **Next.js** - React 服务端渲染框架，使用 App Router
- **React** - 最新版本 React
- **TypeScript** - 严格模式，完整类型安全
- **Bun** - 现代化包管理器和运行时

### 状态管理与 API

- **tRPC** - 端到端类型安全的 API 层
- **TanStack Query** - 客户端状态管理
- **Zod** - 数据验证 schema

### 认证与授权

- **Better Auth** - 后台认证，支持用户名密码 / Google / GitHub / Apple 登录
- **Database Session** - 基于 HttpOnly Cookie 的数据库会话机制

### 数据库与 ORM

- **Drizzle ORM** - 现代化 TypeScript ORM
- **Turso** - Serverless SQLite 数据库

### UI 组件

- **shadcn/ui** - 基于 Radix UI 的组件库
- **Radix UI** - 无障碍 UI 组件
- **Tailwind CSS** - 原子化 CSS 框架
- **Lucide React** - 图标库
- **Motion** - 动画库

### 富文本编辑

- **Tiptap** - 现代化富文本编辑器
- 支持扩展：图片、链接、高亮、任务列表、文本对齐、颜色等

### 功能特性

- **next-intl** - 国际化支持
- **Serwist** - PWA 支持
- **Cloudflare Turnstile** - 验证码
- **Resend** - 邮件服务
- **AWS S3 SDK** - 对象存储

## 项目结构

首次阅读建议从[代码阅读地图](docs/code-reading-map.md)开始，按文章写入、公开读取和当前用户三条路径定位。

```text
src/
├── app/                       # 路由、布局、HTTP 与框架组合
│   ├── (blog)/[locale]/       # 公开页面，URL 不变
│   ├── admin/                 # 后台路由与布局
│   ├── api/                   # HTTP 入口
│   └── _trpc/                 # 根 router 与服务端 caller
├── features/                  # category/comment/link/media/menu/page/post/setting/tag/user
│   └── <feature>/
│       ├── router.ts          # 输入、入口权限与协议适配
│       ├── schema.ts          # 权威业务输入 schema
│       ├── types.ts           # 稳定业务类型
│       ├── rules.ts           # 按需保留的纯业务规则
│       ├── server.ts          # 直接数据库操作，复杂功能可拆成 server/
│       ├── admin/             # 所属业务的后台 UI
│       └── public/            # 按需提供的公开 UI/能力
├── components/                # 通用 UI 与编辑器
└── lib/                       # db/auth/trpc/cache/storage/observability/i18n 等技术能力
```

目录按实际需要创建，不要求每个 feature 都有全部文件。配置、迁移、静态资源和测试仍位于仓库根部相应目录。

### Feature 职责边界

默认路径是 `UI → feature router → feature server 函数 → db`；Server Component 可直接调用服务端读取函数。server 函数直接使用 Drizzle，负责业务规则、事务、条件写入和副作用顺序，不要求额外 Repository 接口、factory 或 Use Case 跳转。`src/packages` 与人工 `application/domain/infrastructure` 分层不再使用。

业务 schema、类型、状态和选项属于相应 feature；跨功能可直接复用所属 feature 的纯契约、有意复用的 UI 或服务端操作，以具名具体入口表达依赖，不要求 public barrel 或中央 contracts 转发。通用组件通过注入获得业务能力，lib 只提供技术实现。`lib/db`、`lib/auth` 可引用 feature 拥有的纯目录、schema 或类型，但不能加载业务 server 操作。

根 tRPC 组合在 `src/app/_trpc/router.ts`，服务端 caller 在 `src/app/_trpc/server.ts`。`lib/trpc` 只保留公共核心、上下文、客户端和传输工具；客户端可 type-only 引用根 `AppRouter`，不能运行时加载 app 或业务 router。

Router 保留入口授权、限流和错误协议；发布条件、并发防护、数据库校验、公开 DTO 裁剪和副作用失败语义不变。数据库提交后缓存同步失败仍返回降级 `publicSync`，不能把已提交写入变成失败。浏览器/服务端/Edge 边界、草稿恢复和 Sentry 隐私约束均须保持。

认证框架绑定保留在 `src/auth.ts`；认证 hook 与登录审计组合位于 `src/app/_auth`。`lib/trpc/context.ts` 仅为会话读取延迟加载该绑定，这是已有的窄技术集成，不允许 lib/auth 加载业务操作。

权限入口统一登记在 `src/lib/auth/capability-registry.ts`。tRPC、Admin Action、Admin route 和后台菜单只能使用已登记 capability；前端检查不能替代服务端授权。详细规则见[架构与依赖边界](docs/architecture-dependency-report.md)及[权限矩阵](docs/permission-matrix.md)。

## 快速开始

### 环境要求

- Node.js >= 22.12
- Bun >= 1.4.2
- Turso 账号
- Cloudflare 账号（可选，用于 R2 和 Turnstile）
- Resend 账号（可选，用于邮件服务）

### 安装依赖

```bash
bun install
```

### 环境变量配置

创建 `.env.local` 文件：

```env
# Turso 数据库（必填）
TURSO_URL=your_turso_url
TURSO_TOKEN=your_turso_token

# 站点配置（NEXT_PUBLIC_SITE_URL 必填）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ASSET_URL=https://static.example.com

# Cloudflare R2（对象存储，可选；启用时四项必须同时配置）
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name

# Cloudflare Turnstile（验证码，可选；启用时两项必须同时配置）
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key

# Resend（邮件服务，评论邮件场景必填）
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_from_email
ADMIN_EMAIL=your_admin_email

# Better Auth（必填）
# 生产环境必须至少 32 个字符，且使用至少三类字符（大小写、数字、符号）
AUTH_SECRET=your_high_entropy_auth_secret
AUTH_URL=http://localhost:3000

# Analytics（可选）
NEXT_PUBLIC_GA_BLOG_ID=your_blog_ga_id
NEXT_PUBLIC_GA_ADMIN_ID=your_admin_ga_id

# OAuth Providers（可选；未配置则对应按钮不会显示）
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
AUTH_APPLE_ID=your_apple_service_id
AUTH_APPLE_SECRET=your_apple_client_secret

# Upstash Redis（生产限流建议配置；评论创建等独立限流入口依赖它）
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# CSP 发布模式（可选；生产环境设为 true 时只报告、不拦截）
CSP_REPORT_ONLY=true
```

生产启动时会校验核心变量和已启用集成的完整性；缺失、空值或 URL/邮箱格式错误会让进程立即失败。错误信息只列出变量名和原因，不回显秘密值。`next build` 阶段不会连接数据库，也不会执行生产启动校验。

R2、Turnstile、Resend、OAuth Provider 与 Upstash 是可选集成：完全不配置即关闭；一旦配置其中一项，就必须补齐同组变量。生产环境中，Upstash 缺失、超时或故障时，通用 API 代理会 fail-open 放行请求以保持可用；评论创建等具有独立限流的入口仍会 fail-closed 拒绝请求，返回 `503`。生产部署应完整配置 Upstash，以启用通用 API 限流和这些受保护的写入入口。

### 登录说明

- 后台登录页为 `/admin/login`
- 支持用户名密码登录，以及 Google / GitHub / Apple OAuth 登录
- 支持已绑定用户使用 Passkey 登录；Passkey 可在后台“账号安全”页面注册和管理
- OAuth Provider 只有在对应环境变量存在时才会启用并展示按钮
- OAuth 回调地址为 `/api/auth/callback/google`、`/api/auth/callback/github` 和 `/api/auth/callback/apple`
- 用户名密码登录在配置 Turnstile 时会校验验证码，并使用 `bcrypt` 哈希比对密码
- 六位密码下限为兼容现有账号而保留，属于已接受风险；未来提升长度必须单独评估已有凭据和用户迁移。
- 登录后的会话由 Better Auth 维护，权限判定以数据库中的用户状态和角色为准
- 从 NextAuth 切换后旧 Cookie 不再兼容，首次发布后所有用户需要重新登录
- Passkey 的生产 RP ID 为 `www.guanweisong.com`，认证来源为 `https://www.guanweisong.com`

### 数据库迁移

```bash
# 修改 schema 后生成并提交迁移文件
bun run db:generate

# 仅在可丢弃的本地数据库快速同步 schema
bunx drizzle-kit push

# 在新环境或已接管 migration ledger 的共享环境执行版本化迁移
bun run db:migrate

# 验证 journal、SQL 跟踪状态及 schema/迁移是否共同变更
bun run db:migrations:check
```

生产和共享环境禁止使用 `drizzle-kit push`。当前 `0000_production_baseline`
仅用于初始化空数据库；现有生产库在完成 migration ledger 接管前不得执行
`db:migrate`。备份、接管和回滚步骤见
[`docs/database-migration-runbook.md`](docs/database-migration-runbook.md)。

### 启动开发服务器

```bash
bun run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 可用脚本

```bash
# 开发
bun run dev          # 启动开发服务器

# 构建
bun run build        # 构建生产版本
bun run start        # 启动生产服务器

# 代码质量
bun run lint             # ESLint 检查
bun run lint:fix         # 自动修复可修复的 ESLint 问题
bun run format           # Prettier 格式化
bun run check-types      # TypeScript 类型检查

# 测试
bun run test             # 运行测试（监听模式）
bun run test:unit        # 运行单元测试（监听模式）
bun run test:unit:run    # 运行单元测试（单次）
bun run test:unit:coverage # 生成单元测试覆盖率报告
bun run test:e2e         # 运行 Playwright E2E 测试
bun run test:e2e:ui      # 打开 Playwright UI
bun run test:e2e:smoke   # 运行 smoke E2E 用例
bun run test:e2e:regression # 运行 regression E2E 用例

# 数据库
bun run db:generate          # 生成版本化迁移
bun run db:migrate           # 执行已审查迁移
bun run db:migrations:check  # 检查迁移治理规则
bun run db:schema:audit      # 只读生成生产结构报告
bunx drizzle-kit push        # 仅限可丢弃本地库
bunx drizzle-kit studio      # 打开 Drizzle Studio

```

E2E 测试默认把运行产物写入系统临时目录，避免项目目录内历史报告文件的权限问题：

- `PLAYWRIGHT_OUTPUT_DIR` 默认 `/private/tmp/honeycomb-e2e-results`
- `PLAYWRIGHT_HTML_REPORT` 默认 `/private/tmp/honeycomb-playwright-report`

## API 限流

项目已在 Proxy 层启用 API 限流，基于 `Upstash Redis + @upstash/ratelimit`：

- 入口文件：`src/proxy.ts`
- 限流工具：`src/lib/rate-limit/rate-limit.ts`
- 当前策略：由 `src/lib/rate-limit/rate-limit.ts` 中的 `Ratelimit` 配置决定
- 生效范围：`/api/:path*`

当请求超过阈值时：

- 返回 HTTP `429`
- 响应体：`{"code":429,"message":"Too many requests, please try again later."}`
- 响应头包含：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`

`UPSTASH_REDIS_REST_URL` 与 `UPSTASH_REDIS_REST_TOKEN` 必须成对配置。
生产环境缺失配置、限流服务异常或等待超过 750ms 时，通用 API 代理采用
fail-open：放行请求，并省略不可用的限流响应头。评论创建等使用独立限流的
入口采用 fail-closed：限流不可用时返回 HTTP `503`，超过阈值时返回 `429`。
开发和测试环境未配置 Upstash 时使用允许策略，不模拟实际配额限制。

## 数据库设计

项目使用 Drizzle ORM 定义了以下核心表：

- **user** - 用户表（用户信息、权限等级）
- **category** - 分类表（支持层级结构）
- **post** - 文章表（支持多种类型：文章、电影、图库、引言）
- **page** - 页面表（独立页面）
- **comment** - 评论表（支持嵌套评论）
- **media** - 媒体文件表（图片、视频等）
- **setting** - 网站设置表
- **menu** - 菜单表（导航菜单）
- **tag** - 标签表
- **post_tag** - 文章-标签关联表
- **link** - 友情链接表
- **category_translation** - 分类翻译表
- **post_translation** - 文章翻译表
- **page_translation** - 页面翻译表
- **tag_translation** - 标签翻译表
- **setting_translation** - 网站设置翻译表

### 数据库公共定义

- **objectId** - 自定义 ID 生成器
- **timestamps** - 时间戳字段（createdAt, updatedAt）

## 权限系统

项目使用 capability-based authorization。`ADMIN`、`EDITOR`、`GUEST` 仍是用户和会话中的身份属性，但角色只负责在唯一的 `ROLE_PERMISSIONS` 中映射业务能力；业务代码不得通过角色比较决定授权，也不会把权限数组写入 JWT。

- **ADMIN** - 管理员，拥有所有权限
- **EDITOR** - 编辑，可以管理内容
- **GUEST** - 默认角色，可登录后台；高敏操作仍由接口级权限控制

每个受保护的 tRPC procedure 必须声明所需 Permission。前端导航和按钮也使用同一映射控制可见性，但隐藏 UI 只改善体验，服务端 capability middleware 始终是最终授权边界：

```typescript
permissionProcedure(Permission.postUpdate);

permissionsProcedure([Permission.postUpdate, Permission.postManageTags], {
  mode: "all",
});
```

当前 32 项 Permission、完整角色矩阵和新增权限流程见 [权限矩阵](docs/permission-matrix.md)。

## 国际化

项目使用 next-intl 实现国际化：

- 支持多语言切换
- 内容多语言字段使用实体专属翻译表持久化，并在应用边界组装为 `{ zh, en }`
- 自动根据浏览器语言切换

## PWA 支持

项目集成了 Serwist（Service Worker）：

- `/en/offline` 显式进入 precache，断网访问未缓存文档时返回离线提示和重试按钮
- 自动更新
- 缓存策略配置
- 唯一注册入口为 `/serwist/sw.js`，`public` 不保留旧 Workbox worker

## 安全响应头与 CSP

所有路由统一返回 CSP、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 和防嵌入响应头；HTTPS 生产环境还会启用 HSTS。CSP 会根据 Analytics、Turnstile 和远程资源配置加入最小允许来源。

建议先在生产环境设置 `CSP_REPORT_ONLY=true` 观察浏览器控制台和监控中的违规事件，完成下列检查后再删除该变量或设为 `false`，切换到强制模式：

- 登录、前后台导航和表单提交正常
- Analytics、Turnstile、远程图片与媒体正常加载
- PWA manifest 和 Service Worker 正常注册
- 不存在未解释的 CSP 违规；强制模式发布后再次执行 E2E 冒烟测试

当前策略为保持静态渲染与 CDN 缓存兼容，脚本策略仍包含 `unsafe-inline`，属于已接受风险；这不是严格 nonce/hash CSP。未来移除前必须单独评估静态缓存和脚本注入链路。`report-only` 模式只负责浏览器观察，本工程暂未配置 CSP 报告接收端点。

## 可观测性

项目的可观测性接口不绑定供应商。服务端默认向标准输出写入单行 JSON 日志和指标；部署环境可以注入自己的 `Logger` 和 `Metrics` 实现。日志或指标 adapter 抛错时会被安全包装器隔离，不会改变业务请求、数据库操作或外部服务调用的结果。

### 结构化日志

每条 console 日志固定包含以下字段：

| 字段          | 含义                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`   | ISO 8601 时间戳                                                                                                                                                   |
| `level`       | `info`、`warn` 或 `error`                                                                                                                                         |
| `event`       | `request.started`、`request.completed`、`request.failed`、`server.error`、`database.operation`、`cache.operation`、`external-service.operation` 或 `client.error` |
| `service`     | 服务名，默认 `honeycomb`                                                                                                                                          |
| `environment` | 运行环境，默认取 `NODE_ENV`，不可用时为 `development`                                                                                                             |

请求日志还会带上 `requestId`、`procedure`、`method`，完成或失败时增加 `durationMs` 和 `outcome`。错误使用有界 `cause` 链序列化为 `name`、`message` 和可选 `stack`。所有 context 在输出前递归清洗：密码、token、cookie、authorization、secret、邮箱、IP、请求体、输入参数和 SQL 参数会被脱敏；循环引用和过深对象会转换为安全占位符。不要依赖脱敏来记录原始请求体、凭据或个人信息，调用方仍应避免传入这些数据。

### 指标目录

| 指标                                     | 类型     | 允许标签                            | 说明                                                                         |
| ---------------------------------------- | -------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `api.requests.total`                     | counter  | `procedure`, `method`, `outcome`    | API 请求次数                                                                 |
| `api.request.duration_ms`                | duration | `procedure`, `method`, `outcome`    | API 请求耗时（毫秒）                                                         |
| `api.errors.total`                       | counter  | `procedure`, `method`, `outcome`    | API 失败次数                                                                 |
| `database.operations.total`              | counter  | `queryName`, `operation`, `outcome` | 命名数据库操作次数                                                           |
| `database.operation.duration_ms`         | duration | `queryName`, `operation`, `outcome` | 数据库操作耗时（毫秒）                                                       |
| `database.errors.total`                  | counter  | `queryName`, `operation`, `outcome` | 数据库操作失败次数                                                           |
| `cache.operations.total`                 | counter  | `namespace`, `operation`, `outcome` | 缓存 read、hit、miss、write 和 error 次数；`hit / (hit + miss)` 可计算命中率 |
| `external-service.operations.total`      | counter  | `service`, `operation`, `outcome`   | 外部服务调用次数                                                             |
| `external-service.operation.duration_ms` | duration | `service`, `operation`, `outcome`   | 外部服务调用耗时（毫秒）                                                     |
| `external-service.errors.total`          | counter  | `service`, `operation`, `outcome`   | 外部服务调用失败次数                                                         |

指标标签只允许字符串类型的 `procedure`、`method`、`outcome`、`queryName`、`operation`、`namespace` 和 `service`；其他名称或非字符串值会被丢弃。标签值必须来自稳定枚举或命名目录，禁止使用用户 ID、资源 ID、请求 ID、完整 URL、SQL、参数、错误消息及其他自由文本。API 的 `outcome` 为 `success` 或稳定的 tRPC 错误码；数据库和外部服务使用 `success`/`error`；缓存使用稳定 operation 和 `success`/`error`。

### 接入自定义 adapter

供应商接入只需实现 [`Logger`](src/lib/observability/core/contracts.ts) 和/或 [`Metrics`](src/lib/observability/core/contracts.ts)，并在服务端启动时配置：

```ts
import type { Logger, Metrics } from "@/lib/observability/core/contracts";
import { configureObservability } from "@/lib/observability/server";

const logger: Logger = {
  info: (event, context) => platformLog("info", event, context),
  warn: (event, context) => platformLog("warn", event, context),
  error: (event, context) => platformLog("error", event, context),
};

const metrics: Metrics = {
  increment: (name, labels) => platformCounter(name, labels),
  recordDuration: (name, durationMs, labels) =>
    platformHistogram(name, durationMs, labels),
};

configureObservability({ logger, metrics });
```

`configureObservability` 会对两个 adapter 自动应用脱敏、标签白名单和 fail-open 包装。adapter 内部不得反向调用 `getLogger()` 或 `getMetrics()` 报告自身错误，以免递归；其内部故障应由供应商 SDK 自身的诊断通道处理。若只替换其中一个 adapter，未提供的日志和指标仍使用结构化 console adapter。

当前已接入 `@sentry/nextjs`：服务端现有 Logger 的事件同时写入本地 JSON console 和 Sentry Logs，`Logger.error` 不自动转为 Issues；浏览器将未处理错误、未处理 Promise rejection 及现有 React 错误边界捕获的错误发送到 Issues，并按白名单清洗事件。Metrics 和客户端 console 不转发到 Sentry，不启用 tracing、Replay 或用户信息自动采集。DSN 配置、服务端旧变量兼容及隐私限制见 [Sentry logging](docs/sentry-logging.md)。

未来若接入 OpenTelemetry，可将 `increment` 映射到 Counter、将 `recordDuration` 映射到 Histogram，并把 labels 作为低基数 attributes。其他 adapter 仍须保留现有名称、毫秒单位、标签白名单和 fail-open 语义，不得加入原始 SQL、参数、请求体、凭据或个人信息。

## Sitemap 运行时策略

`/sitemap.xml` 在请求时生成 sitemap 索引，内容按每片 1000 条分页，并缓存 5 分钟。数据库不可用时，索引和首片会降级到站点首页及中英文分类入口，不影响应用构建；动态内容恢复后会在缓存刷新时重新出现。

## 部署

### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

## 测试

项目使用 Vitest 进行单元测试：

```bash
# 运行单元测试
bun run test:unit:run

# 生成覆盖率报告
bun run test:unit:coverage
```

测试文件按业务就近放置在 `src/`，跨模块测试工具和 E2E 测试位于 `tests/`。完整测试说明见 [`tests/README.md`](tests/README.md)。

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 Prettier 格式化
- 编写单元测试
- 添加 JSDoc 注释

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [tRPC](https://trpc.io/) - 端到端类型安全 API
- [Drizzle ORM](https://orm.drizzle.team/) - 现代化 ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Turso](https://turso.tech/) - Serverless SQLite
- [Upstash](https://upstash.com/) - Serverless Redis 与限流服务
