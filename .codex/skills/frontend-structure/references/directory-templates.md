# 目录与文件模板

以下按需创建，不要求每个业务补齐全部文件或采用完全相同的树形结构；选择最小有意义的路径，不机械压平职责明确的子目录。

```text
src/
  app/_trpc/router.ts       # 根业务 router 组合
  app/_trpc/server.ts       # 服务端 caller
  features/<feature>/
    router.ts              # 输入、入口权限、协议适配
    schema.ts              # 唯一业务输入 schema
    types.ts               # 稳定业务模型
    rules.ts               # 按需抽取的纯不变量
    server.ts              # 直接数据库读写与副作用顺序
    admin/                 # 业务后台 UI、选项与交互
    public/                # 公开站点 UI（按需），不是跨 feature 的强制出口
  components/              # 通用 UI
    editor/                # 通用编辑器，注入业务媒体选择
  lib/                     # db/auth/trpc/cache/storage/observability/i18n
```

较复杂功能可把 server.ts 拆为 server/ 下具名文件；文件名选择稳定、可搜索的业务概念。此树是按需示例，不是待补齐清单。

创建或删除入口前，按[架构规则索引](architecture.md)检查职责与消费者；框架约定、动态引用和配置入口不能只靠静态 import 判断。路由特例见 [Next.js 约束](nextjs.md)，批量迁移见[迁移说明](../../../../docs/ddd-migration-guide.md)。
