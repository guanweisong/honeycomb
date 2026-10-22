# 目录与文件模板

以下按需创建，不要求每个业务补齐全部文件或采用完全相同的树形结构；选择最小有意义的路径，不机械压平职责明确的子目录。

```text
src/
  app/_trpc/router.ts       # 根业务 router 组合
  app/_trpc/server.ts       # 服务端 caller
  features/<feature>/
    router.ts              # 输入、入口权限、协议适配
    schema/                # 如 tag.insert.schema.ts，具体运行时契约
    types/                 # 如 tag.insert.ts；每个枚举独立文件
    rules.ts               # 按需抽取的纯不变量
    server/                # 如 tag-commands.ts、tag-queries.ts，实际操作
    admin/                 # 业务后台 UI、选项与交互
    public/                # 公开站点 UI（按需），不是跨 feature 的强制出口
  components/              # 通用 UI
    editor/                # 通用编辑器，注入业务媒体选择
  lib/                     # db/auth/trpc/cache/storage/observability/i18n
```

类型和 schema 按单一职责拆分，相关输入及基础类型可同文件；枚举一文件一个。types/ 可以拥有中立 enum/catalog，但 DTO 文件仍为 type-only，展示枚举不能成为业务依赖。server/ 保留真实职责明确的具名实现，不为函数数量增加薄 wrapper。dashboard 等没有真实契约需求的模块不创建 types/schema；此树是按需示例，不是待补齐清单。

创建或删除入口前，按[架构规则索引](architecture.md)检查职责与消费者；框架约定、动态引用和配置入口不能只靠静态 import 判断。路由特例见 [Next.js 约束](nextjs.md)，批量迁移见[迁移说明](../../../../docs/ddd-migration-guide.md)。
