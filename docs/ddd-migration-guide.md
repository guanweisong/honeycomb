# 简单 Feature 架构迁移说明

此文件保留原链接，但当前规范已由简单 feature 架构取代旧 DDD 目录约定。工程仍是单服务，不拆微服务、不更换数据库，不改变 URL、tRPC 输入输出、权限和用户行为。

## 放置代码

- `app` 负责路由、布局、HTTP、根 tRPC 组合和框架缓存。
- `features/<feature>` 负责自己的 router、schema、types、纯 rules、server 操作与 admin/public UI。
- `components` 负责通用 UI/编辑器，以注入接入媒体选择等业务能力。
- `lib` 负责 db、auth、trpc、cache、storage、observability、i18n 等技术能力。

feature 直接使用 `server.ts` 或有实际拆分需要的 `server/`。简单读取与写入均可在该处直接使用数据库；不要求 Repository 接口、factory、Use Case 或 `application/domain/infrastructure` 层。保留函数的依据是实质职责，而不是旧文件名。

## 迁移顺序

1. 找出实际入口、调用链和行为测试，记录权限、状态转换、事务、并发保护及副作用失败语义。
2. 将业务枚举、schema、类型和 UI 选项归回所属 feature；通用技术实现归入 lib，通用组件归入 components。
3. 合并仅转发参数的入口和重复接口，以直接的 server 函数表达查询或业务流程。稳定纯规则保留可独立测试的函数，不为它重新制造聚合生命周期。
4. 同步全部消费者、测试、mock、配置、文档和 OpenSpec，再删除旧出口；不保留中央 contracts 或兼容转发层。
5. 检查浏览器、服务端与 Edge 依赖图。根 tRPC 组合留在 app，lib/trpc 的根类型引用必须是 type-only。
6. 运行受影响行为测试及完整质量门禁，逐项报告真实结果。数据库验证只用独占临时本地数据库，不执行生产写入。

## 保留的类型安全要求

- 同语义模型只有一个权威定义；需要运行时验证时从唯一 schema 推导类型，不用 `satisfies` 连接两套字段清单。
- server 函数可使用数据库类型，但公开输出、UI props 和纯业务 schema 不依赖 ORM 实现。公开响应必须真正裁剪敏感字段。
- 禁止显式 `any`、`as never` 和规则抑制掩盖契约；使用准确 fixture、typed mock、最小依赖子集及明确空值分支。
- 允许 `as const` 与有具体原因的最小第三方适配断言；不得引入通用强转工具。
- `lib/db`、`lib/auth` 对 feature 的引用仅限纯目录、schema 和类型，不得加载业务操作。

## 不变的安全与可靠性约束

服务端 capability、GUEST 可见性、公开 DTO、发布与账号保护、分类 SQL 防环、事务和条件写入、评论通知容错、缓存 `publicSync` 降级、媒体删除不确定结果、草稿恢复及 Sentry 隐私边界均须保留。详细说明见[架构与依赖边界](architecture-dependency-report.md)和[权限矩阵](permission-matrix.md)。
