## Context

`packages` 目前混合按技术能力和按业务能力命名的顶层目录：`auth`、`account-security`、`db`、`http`、`notifications`、`observability`、`security`、`domain`、`trpc`、`ui`。其中 `domain` 只含用户与国际化，多个文章与评论的稳定状态枚举仍被 tRPC feature 作为事实来源。

## Goals / Non-Goals

**Goals:**

- 让开发者从顶层目录即可识别领域、身份、应用、基础设施、传输和 UI 六层。
- 让稳定的业务术语只在 domain 定义一次，并被数据库、认证、应用、tRPC 和 UI 复用。
- 保持传输输入输出与实现适配器留在正确层级。

**Non-Goals:**

- 不变更 tRPC procedure、HTTP 路由、数据库 schema 或运行时行为。
- 不将 procedure output、列表筛选或表单输入 schema 放入 domain。
- 不创建空目录或仅为对称性拆分未复用的 feature 逻辑。

## Decisions

### 六个顶层层级

目录固定为：`domain`（业务概念）、`identity`（认证与账号安全）、`application`（跨实体用例编排）、`infrastructure`（数据库和外部技术适配）、`trpc`（传输层）及 `ui`（共享展示层）。不再保留原有小型顶层包。

### domain 按业务子域组织

使用 `identity/user.ts`、`content/post.ts`、`content/page.ts`、`content/comment.ts`、`content/tag.ts`、`navigation/menu.ts`、`localization/i18n.ts` 与 `shared/status.ts`。只迁移枚举、名称映射、选项和跨层稳定类型；`CommentRecord`、tRPC outputs、查询可见性筛选与 Zod schema 保持原位。

### 传输层保留 API 专属模型

`ContentVisibility`、`ResourceVisibility` 等表达 procedure 读取范围而非业务实体状态，继续归属于 tRPC。`outputs.ts` 也保留在 tRPC，因为它依赖 `AppRouter`。

### 依赖方向

`domain` 不依赖其他 packages；`identity`、`application`、`infrastructure` 可依赖 domain；`trpc` 组合前三层；`ui` 只依赖 domain 与 UI 内部。基础设施不得依赖 tRPC 或 App Router。

## Risks / Trade-offs

- [路径迁移范围大] → 先建立目录和依赖测试，再用类型检查与全量单测发现遗漏。
- [把 API 概念误迁入 domain] → 仅迁移现有枚举/选项等稳定概念；输入输出和可见性筛选不动。
- [跨层循环] → 以 `domain` 为唯一底层，继续使用 AST 边界测试验证。

## Migration Plan

1. 添加失败的架构和领域来源测试。
2. 迁移领域模块及其消费者。
3. 迁移 identity、application、infrastructure 目录及其消费者。
4. 删除空旧目录，运行类型、Lint、单元测试和生产构建。
