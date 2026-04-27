# Honeycomb

<div align="center">

一个基于 Next.js 16 + tRPC + Drizzle ORM 构建的现代化 Serverless 全栈 CMS 系统，实现了端到端类型安全。

[![Next.js](https://img.shields.io/badge/Next.js-16.2.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

## 特性

- 🚀 **现代化技术栈** - Next.js 16 + React 19 + TypeScript 5.9
- 🔒 **端到端类型安全** - tRPC + Drizzle ORM + Zod 实现全栈类型推断
- 🌍 **国际化支持** - 基于 next-intl 的多语言支持
- 🎨 **现代化 UI** - shadcn/ui + Radix UI + Tailwind CSS 4
- 📝 **富文本编辑** - Tiptap 编辑器，支持图片、链接、高亮等
- 🔐 **权限管理** - 基于角色的访问控制（ADMIN/EDITOR/GUEST）
- 📱 **PWA 支持** - Serwist 提供离线能力
- 🎯 **Serverless 架构** - 完全无服务器部署
- 🗄️ **现代化数据库** - Turso (LibSQL) 高性能 SQLite
- 📧 **邮件通知** - Resend 邮件服务集成
- 🖼️ **对象存储** - Cloudflare R2 / AWS S3 支持
- 🤖 **验证码** - Cloudflare Turnstile 行为验证

## 技术架构

### 核心框架
- **Next.js 16.2.0** - React 服务端渲染框架，使用 App Router
- **React 19.2.4** - 最新版本 React
- **TypeScript 5.9.3** - 严格模式，完整类型安全
- **Bun 1.3.3** - 现代化包管理器和运行时

### 状态管理与 API
- **tRPC 11.3.1** - 端到端类型安全的 API 层
- **TanStack Query 5.80.6** - 服务端状态管理
- **Zustand 4.5.0** - 客户端状态管理
- **Zod 4.1.11** - 数据验证 schema

### 数据库与 ORM
- **Drizzle ORM 0.44.7** - 现代化 TypeScript ORM
- **Turso (LibSQL)** - Serverless SQLite 数据库
- **Drizzle-Zod** - 自动生成 Zod schema

### UI 组件
- **shadcn/ui** - 基于 Radix UI 的组件库
- **Radix UI** - 无障碍 UI 组件
- **Tailwind CSS 4.1.15** - 原子化 CSS 框架
- **Lucide React** - 图标库
- **Motion 12.9.2** - 动画库

### 富文本编辑
- **Tiptap 3.15.3** - 现代化富文本编辑器
- 支持扩展：图片、链接、高亮、任务列表、文本对齐、颜色等

### 功能特性
- **next-intl 4.0.2** - 国际化支持
- **Serwist 9.5.7** - PWA 支持
- **Cloudflare Turnstile** - 验证码
- **Resend 6.5.2** - 邮件服务
- **AWS S3 SDK** - 对象存储

## 项目结构

```
honeycomb/
├── src/
│   ├── app/                    # Next.js 应用
│   │   ├── (blog)/            # 前台应用
│   │   │   ├── [locale]/      # 国际化路由
│   │   │   ├── i18n/          # 国际化配置
│   │   │   └── Providers.tsx  # 全局提供者
│   │   ├── admin/             # 后台管理
│   │   │   └── (root)/        # 管理后台路由
│   │   ├── api/               # API 路由
│   │   ├── manifest.ts        # PWA manifest
│   │   ├── robots.ts          # SEO robots
│   │   └── sitemap.ts         # SEO sitemap
│   └── packages/              # 共享包
│       ├── db/                # 数据库层
│       │   ├── schema.ts      # 数据库 schema
│       │   ├── db.ts          # 数据库连接
│       │   └── *.ts           # 自定义字段类型
│       ├── trpc/              # tRPC API 层
│       │   ├── api/           # API 路由
│       │   │   ├── core.ts    # tRPC 核心
│       │   │   ├── context.ts # 请求上下文
│       │   │   └── modules/   # 业务模块
│       │   └── client/        # 客户端配置
│       └── ui/                # UI 组件库
│           ├── components/    # 基础组件
│           ├── extended/      # 扩展组件
│           └── lib/           # 工具函数
├── public/                    # 静态资源
├── tests/                     # 测试文件
├── drizzle.config.ts          # Drizzle 配置
├── next.config.ts             # Next.js 配置
├── tailwind.config.ts         # Tailwind 配置
├── tsconfig.json              # TypeScript 配置
└── package.json               # 项目依赖
```

## 快速开始

### 环境要求

- Node.js >= 18
- Bun >= 1.3.3
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
# Turso 数据库
TURSO_URL=your_turso_url
TURSO_TOKEN=your_turso_token

# Cloudflare R2 (对象存储)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=your_public_url

# Cloudflare Turnstile (验证码)
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key

# Resend (邮件服务)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_from_email

# Next Auth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_nextauth_url
```

### 数据库迁移

```bash
# 生成迁移文件
bun drizzle-kit generate

# 推送 schema 到数据库
bun drizzle-kit push
```

### 启动开发服务器

```bash
bun dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 可用脚本

```bash
# 开发
bun dev              # 启动开发服务器

# 构建
bun build            # 构建生产版本
bun start            # 启动生产服务器

# 代码质量
bun lint             # ESLint 检查
bun format           # Prettier 格式化
bun check-types      # TypeScript 类型检查

# 测试
bun test             # 运行测试（监听模式）
bun test:run         # 运行测试（单次）
bun test:coverage    # 生成测试覆盖率报告

# 数据库
bun drizzle-kit generate  # 生成迁移文件
bun drizzle-kit push      # 推送 schema
bun drizzle-kit studio    # 打开 Drizzle Studio

# 部署
bun build:cloudflare      # 构建 Cloudflare 版本
bun deploy:cloudflare     # 部署到 Cloudflare
```

## 数据库设计

项目使用 Drizzle ORM 定义了以下核心表：

- **user** - 用户表（用户信息、权限等级）
- **category** - 分类表（支持层级结构）
- **post** - 文章表（支持多种类型：文章、电影、图库、引言）
- **page** - 页面表（独立页面）
- **comment** - 评论表（支持嵌套评论）
- **media** - 媒体文件表（图片、视频等）
- **token** - Token 表（认证令牌）
- **setting** - 网站设置表
- **menu** - 菜单表（导航菜单）
- **tag** - 标签表
- **post_tag** - 文章-标签关联表
- **link** - 友情链接表

### 自定义字段类型

- **i18nField** - 国际化字段（支持多语言）
- **objectId** - 自定义 ID 生成器
- **timestamps** - 时间戳字段（createdAt, updatedAt）

## 权限系统

项目实现了基于角色的访问控制（RBAC）：

- **ADMIN** - 管理员，拥有所有权限
- **EDITOR** - 编辑，可以管理内容
- **GUEST** - 访客，只能查看内容

权限通过 tRPC middleware 实现：

```typescript
protectedProcedure([UserLevel.ADMIN, UserLevel.EDITOR])
```

## 国际化

项目使用 next-intl 实现国际化：

- 支持多语言切换
- 字段级别的多语言支持（i18nField）
- 自动根据浏览器语言切换

## PWA 支持

项目集成了 Serwist（Service Worker）：

- 离线访问支持
- 自动更新
- 缓存策略配置

## 部署

### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### Cloudflare 部署

```bash
# 构建 Cloudflare 版本
bun build:cloudflare

# 部署到 Cloudflare
bun deploy:cloudflare
```

## 测试

项目使用 Vitest 进行单元测试：

```bash
# 运行测试
bun test

# 生成覆盖率报告
bun test:coverage
```

测试文件位于 `src/packages/trpc/api/modules/*/` 目录下。

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
