# 目录与文件模板

以下按需创建，不要求每个业务补齐全部文件或采用完全相同的树形结构；选择最小有意义的路径，不机械压平职责明确的子目录。

```text
src/
  app/<route>/page.tsx     # 路由入口与页面组合
  app/<route>/options.ts   # 路由拥有的展示选项
  app/<route>/<feature>-actions.ts # 路由拥有的客户端业务操作
  app/<route>/components/  # 路由拥有的 UI；此处不放 page/layout/route 入口
  app/admin/components/    # 管理后台外层 shell 拥有的 UI
  app/admin/(dashboard)/   # 后台路由组拥有的共享工具和 UI
    components/            # 仅真正跨页面复用的组件
    config/                # dashboard 路由组共享配置
    draft/                 # dashboard 路由组本地草稿能力
    lib/                   # dashboard 路由组共享状态工具
    types/                 # dashboard 路由组共享 UI 类型
  app/trpc/router.ts        # 根业务 router 组合
  app/trpc/server.ts        # 服务端 caller
  features/<feature>/
    router.ts              # 输入、入口权限、协议适配
    schemas/               # 如 tag.insert.schema.ts，具体运行时契约
    types/                 # 如 tag.insert.ts；每个枚举独立文件
    rules/                 # 如 post-publication.ts，纯不变量与就近测试
    server/                # 如 tag-commands.ts、tag-queries.ts，实际操作
  components/              # 全站通用 UI
    editor/                # 通用编辑器，注入业务媒体选择
  lib/                     # db/auth/trpc/cache/storage/observability/i18n
    auth/client.ts         # use client 浏览器认证单例；服务端 auth.ts 保留根位置
```

类型和 schema 按单一职责拆分，相关输入及基础类型可同文件；枚举一文件一个。types/ 可以拥有中立 enum/catalog，但 DTO 文件仍为 type-only，展示枚举不能成为业务依赖。server/ 保留真实职责明确的具名实现，不为函数数量增加薄 wrapper。dashboard 等没有真实契约需求的模块不创建 types/schemas；此树是按需示例，不是待补齐清单。

创建或删除入口前，按[架构规则索引](architecture.md)检查职责与消费者；框架约定、动态引用和配置入口不能只靠静态 import 判断。路由特例见 [Next.js 约束](nextjs.md)，批量迁移见[迁移说明](../../../../docs/ddd-migration-guide.md)。
