# Honeycomb

本博客是结合Drizzle ORM和tRPC实现了端到端类型安全的Serverless全栈项目。

## 技术架构

- 前端 (`app/blog`):
  - Next.js: React 服务端渲染框架。
  - TypeScript: 提供静态类型。
  - Tailwind CSS: CSS 框架。
- 管理后台 (`app/admin`):
  - 技术栈与前端应用一致，用于内容管理。
- 服务端 (`app/api`):
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

- `app/blog` (前台应用):
  - 面向用户的网站，用于展示文章、页面等内容。
  - 功能包括多语言支持。
- `app/admin` (后台管理):
  - 用于内容管理的后台界面。
  - 提供对文章、页面、分类、标签、媒体等内容的增删改查（CRUD）功能。
  - 包含用户权限和系统设置管理。
- `app/api` (API 服务):
  - 为前台和后台应用提供数据接口。
  - 处理用户认证、内容查询等业务逻辑。

## 三方服务

- 行为验证码 使用 腾讯防水墙服务
- 对象存储 使用 [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/)
- 数据库托管 使用 [Turso](https://turso.tech)
- 应用部署 使用 [Cloudflare Workers](https://workers.cloudflare.com)
- 邮件服务 使用 [resend](https://resend.com)