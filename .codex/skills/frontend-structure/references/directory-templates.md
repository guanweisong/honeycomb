# 目录与文件模板

以下按需创建，不要求每个业务补齐全部文件。

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

较复杂功能可把 server.ts 拆为 server/ 下具名文件；并非强制目录。不同查询和表单校验可以按语义拆分 schemas/，但不要保留只重新导出 schema.ts 的中间文件。状态、类型或显示选项属于其 feature，不建立集中业务 contracts 或共享 domain 包。

不创建 application/domain/infrastructure、单方法 Repository、只返回对象方法的 factory、仅原样调用另一函数的 Use Case。已有 helper 有事务、映射、并发或外部适配职责时应保留，不为减少行数合并不同安全边界。

文件名使用稳定、可搜索的业务概念；utils.ts/helpers.ts 不能成为无边界杂物箱。迁移必须同步 import、mock、配置、测试和文档后删除旧路径，不保留兼容转发入口。

App Router 的 page.tsx、layout.tsx、route.ts 等约定入口必须保留；入口直接导出具名业务组件是框架适配，不等同于应删除的重复 feature 转发层。删除文件前检查框架约定、动态引用和配置，不只看静态 import。
