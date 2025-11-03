# Honeycomb

本项目是 `honeycomb` 的 monorepo 仓库，使用 pnpm workspaces 和 Turborepo 进行管理，结合Drizzle ORM和tRPC实现了端到端类型安全的Serverless全栈项目。

## 技术架构

- Monorepo:
  - pnpm workspaces: 用于管理多项目依赖。
  - Turborepo: 用于优化 monorepo 的构建流程。
- 前端 (`apps/front`):
  - Next.js: React 服务端渲染框架。
  - TypeScript: 提供静态类型。
  - Tailwind CSS: CSS 框架。
- 管理后台 (`apps/admin`):
  - 技术栈与前端应用一致，用于内容管理。
- 服务端 (`apps/server`):
  - Next.js (Route Handlers): 用作后端 API 服务。
  - tRPC: 用于实现类型安全的 API。
- 数据库与 ORM (`packages/db`):
  - Drizzle ORM: TypeScript ORM。
- 共享模块 (`packages/*`):
  - `ui`: 共享 UI 组件。
  - `types`: 共享 TypeScript 类型定义。
  - `validation`: 使用 Zod 定义数据验证 schema。

## 功能架构

`honeycomb` 是一个内容管理系统（CMS）。

- `apps/front` (前台应用):
  - 面向用户的网站，用于展示文章、页面等内容。
  - 功能包括多语言支持。
- `apps/admin` (后台管理):
  - 用于内容管理的后台界面。
  - 提供对文章、页面、分类、标签、媒体等内容的增删改查（CRUD）功能。
  - 包含用户权限和系统设置管理。
- `apps/server` (API 服务):
  - 为前台和后台应用提供数据接口。
  - 处理用户认证、内容查询等业务逻辑。

## 三方服务

- 行为验证码 使用 腾讯防水墙服务
- 对象存储 使用 [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/)
- 数据库托管 使用 [Turso](https://turso.tech)
- 应用部署 使用 [Cloudflare Pages](https://pages.cloudflare.com)
- 邮件服务 使用 [resend](https://resend.com)