---
name: frontend-structure
description: 当在本 Next.js 前端工程中处理路由、页面、组件、交互、样式、依赖、包边界、UI 复用或前端架构决策时使用。
---

# 前端工程结构

## 工程基线

- Next.js `16.3.0` App Router、React `19.2.8`、严格模式 TypeScript、Bun `1.3.3`，Node `>=20.9`。
- 业务代码位于 `src/`，路由文件位于 `src/app/`；本工程不使用 Pages Router。
- `@/*` 映射到 `src/*`，优先使用该别名，避免过深的相对路径。
- `@tests/*` 映射到仓库根目录的 `tests/*`，测试代码引用共享夹具、测试工具和测试数据时优先使用该别名。
- 主要技术栈：tRPC 11、TanStack Query 5、Better Auth、Drizzle、`next-intl`、Tailwind CSS 4、Sass、Radix UI、shadcn。

## 目录与职责

### 文件与目录命名

- `src/app` 下的业务组件目录统一使用大驼峰，例如 `components/PageEditorForm/`；组件入口和测试固定为 `index.tsx`、`index.test.tsx`。
- 非组件 TypeScript/TSX 文件统一使用短横线命名（kebab-case），例如 `page-editor-query.ts`、`admin-query-client.ts`、`security-headers.ts`。
- 测试文件在被测文件名后追加 `.test`，例如 `page-editor-query.test.ts`；不要使用 `page.editor.query.test.ts` 这种多段点号拆词形式。
- 同一模块的实现文件与测试文件必须保持完全相同的基础文件名；禁止一处使用小驼峰、另一处使用短横线。
- React 组件的导出符号使用大驼峰，Hook 使用 `use` 加大驼峰；文件命名仍遵循所在目录规则，不以导出符号改变文件名规则。
- Next.js 保留文件必须使用框架约定名称，例如 `page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`、`route.ts`，不得改写为短横线或业务名称。
- 公共入口使用 `index.ts`/`index.tsx`；只有组件目录入口和明确的目录模块入口使用 `index`，普通单文件模块不要为了命名统一而额外创建目录。

### 可读性与格式化

- 生产代码、应用层用例、查询、命令和测试必须保持正常的多行格式；禁止为了迁移速度、压缩 diff 或减少行数把函数、条件、对象和调用链压成单行。
- 优先使用项目 Prettier 配置自动格式化，不手工维护与格式化工具冲突的排版；完成代码迁移后至少运行 `bunx prettier --write <受影响文件>`、`bun run lint` 和 `bun run check-types`。
- 长函数应按职责拆分为有名称的辅助函数；格式化不是替代职责拆分的手段，也不得通过单行化掩盖复杂逻辑。
- 新增或迁移的公开函数、查询、命令和跨模块导出必须保留清晰的 JSDoc 与参数换行，保证代码审查时可以直接阅读控制流和副作用。

### 导入路径边界

- 同一目录或同一功能模块内的近邻文件可以使用相对路径，例如 `./post-transforms`、`../hooks/use-comment-identity`。
- 跨 package、跨业务层或跨 `src` 顶层目录时，必须优先使用 `@/*`，禁止新增三层及以上的 `../` 相对路径。
- `src` 或 `tests` 中引用仓库根目录 `tests` 下的共享夹具、测试工具和测试数据时，统一使用 `@tests/*`，禁止使用 `../../../../tests/*` 形式的深层路径。
- 新增别名必须同步更新 `tsconfig.json`、Vitest/构建工具解析配置和相关测试；别名只解决路径可读性，不得绕过包边界或服务端/客户端边界。
- 被独立 Next.js 配置、构建 fixture 或不读取项目 TypeScript alias 的工具直接加载的模块，可以保留必要的相对路径；必须有对应边界测试，不能为了形式统一引入该运行环境无法解析的 alias。

下列目录是架构边界，不只是命名约定：

| 目录 | 职责 | 可依赖方向 |
| --- | --- | --- |
| `src/app` | Next 路由、布局、加载/错误 UI、路由级编排 | `packages` 与路由内模块 |
| `src/packages/domain` | 与框架、传输层无关的领域概念和契约 | 仅自身与标准库 |
| `src/packages/identity` | 认证、授权、账户安全用例 | domain 及经过批准的基础设施抽象 |
| `src/packages/application` | 应用层编排，例如通知 | domain 与下层抽象 |
| `src/packages/infrastructure` | 数据库、HTTP、可观测性、安全适配器 | domain/application 与外部依赖 |
| `src/packages/trpc` | API Router、输入 Schema、传输输出、客户端绑定 | 按需依赖 application/domain/infrastructure |
| `src/packages/ui` | Radix/shadcn 基础组件、扩展组件、UI 工具 | React/UI 依赖；禁止依赖 App Router 和 tRPC |

特定于 Blog 的代码放在 `src/app/(blog)`，特定于 Admin 的代码放在 `src/app/admin`。只有在多个路由区域确实复用且 API 稳定时，才提升到 `src/packages/ui`。

`src/app` 下的业务目录必须统一组织组件：组件只能放在当前业务目录的 `components` 文件夹中，并采用“一组件一个目录”的形式。组件目录名使用大驼峰，入口和测试文件固定如下：

```text
业务目录/
└── components/
    └── ComponentName/
        ├── index.tsx
        └── index.test.tsx
```

例如 `src/app/admin/components/PhotoPicker/index.tsx` 与 `src/app/admin/components/PhotoPicker/index.test.tsx`。业务组件必须配套同目录下的 `index.test.tsx`；不要将业务组件直接放在业务目录根部、散落在其他目录，或把多个组件合并到同一个文件/目录中。

业务目录中的非组件代码也按职责分目录管理，避免同类型文件长期平铺：

```text
业务目录/
├── components/   # 页面和交互组件，一个组件一个目录
├── actions/      # 写操作、提交操作、Mutation 编排
├── queries/      # 查询 Hook、查询参数和读取逻辑
├── transforms/   # API/表单/领域数据转换
├── columns/      # DataTable 列定义及其展示转换
├── hooks/        # 不属于 actions/queries 的通用业务 Hook
├── constants/    # 业务常量和菜单/表格配置
├── utils/        # 纯函数工具
└── page.tsx      # 路由入口，只负责页面级组合
```

当同一业务目录出现两个或以上同类型文件时，优先建立对应分类目录，并将测试文件与被测文件放在同一分类目录中。例如 `userActions.ts` 和 `userActions.test.ts` 应放在 `actions/`，`userQuery.ts` 和 `userQuery.test.ts` 应放在 `queries/`。单文件模块使用 `queries/pageEditorQuery.ts` 与 `queries/pageEditorQuery.test.ts`；只有模块需要多个协作文件时，才升级为 `queries/pageEditorQuery/index.ts` 目录模块。路由约定文件（`page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`）和业务目录唯一的入口文件可以保留在根部；不要为了凑目录层级移动它们。

## Next.js 路由与渲染

- 使用 App Router 文件约定：`page.tsx` 暴露路由，`layout.tsx` 组织共享 UI，`loading.tsx` 表示加载态，`error.tsx` 处理分段错误，`route.ts` 提供 HTTP 接口。
- `(blog)` 等 Route Group 只用于组织路由和布局，不改变 URL；不要用 Route Group 掩盖不合理的功能边界。
- 页面和布局默认使用 Server Component。只有需要状态、事件、Effect、浏览器 API 或客户端 Hook 时才添加 `"use client"`。
- `"use client"` 会将被导入的模块图纳入客户端 Bundle。服务端密钥、数据库、认证校验和 server-only 模块不得进入该模块图；优先拆成小型客户端岛，并由服务端传入可序列化 Props 或 Children。
- 路由区域 Provider 放在对应区域：Blog 使用 `src/app/(blog)/Providers.tsx`，Admin 使用 `src/app/admin/AdminProviders.tsx`。能局部提供时不要新增全局 Provider。
- 受保护的 Admin UI 必须在服务端边界先完成认证/授权；客户端 Hook 只能反映状态，不能作为唯一权限校验。
- `robots.ts`、`sitemap*.ts`、`manifest.ts`、`route.ts` 等 SEO 和平台处理文件放在 App Router 约定位置。

## 依赖与导入边界

- `domain` 不得导入 `identity`、`application`、`infrastructure`、`trpc`、`ui`、`src/app`、环境模块或框架传输代码。
- `identity`、`application`、`infrastructure`、`ui` 不得导入 App Router 模块或 `packages/trpc`。
- tRPC 派生的实体/输出只停留在传输边界；`src/packages/trpc/api/modules` 内不要新增 `.entity.ts` 或 `.output.ts` 文件。
- 环境变量解析集中在 `src/env`，服务端和客户端 Schema 分离；Client Component 不得导入服务端环境值。
- 服务端能力应隐藏在 server 模块和明确边界之后；可能被误导入客户端的模块使用 `server-only`。
- `src/packages/trpc/client` 只供客户端组合层和功能 Hook 使用；Router/Schema 放在 `src/packages/trpc/api`，通用 UI 不得依赖它们。
- 优先使用依赖注入或窄接口，禁止让 domain 直接依赖基础设施适配器。
- 新增依赖前先检查 `package.json`、`src/packages/ui/components` 和 `src/packages/ui/extended`，避免重复引入能力。

这些约束由 `src/packages/package-boundaries.test.ts` 执行验证。只有在架构边界确实发生有意变化时，才同步修改该测试。

## UI、样式与复用

- 基础组件位于 `src/packages/ui/components`；`components.json` 规定使用 shadcn/Radix、RSC、Lucide、CSS Variables，以及 `src/packages/ui/styles/globals.css`。
- 复杂且可复用的组件位于 `src/packages/ui/extended`，测试与组件相邻。业务代码选用 UI 组件时，先检查 `src/packages/ui/extended`：如果其中已有对 `src/packages/ui/components` 基础能力的封装或增强，优先使用 `extended` 下的组件，避免绕过统一交互、状态管理和样式约定直接使用基础组件。不要在业务目录重复实现 DataTable、表单、Dialog、Select、Tabs、编辑器或图片选择器。
- 类名组合使用 `src/packages/ui/lib/utils` 的 `cn`。优先使用 Tailwind 工具类和已有 CSS 变量；已有路由级 Sass 位于 `src/app/(blog)/app.scss` 和 `src/app/admin/globals.scss`，不要引入新的样式体系。
- 全局 CSS 只在对应布局/Provider 边界引入，不要把路由专属全局样式带入无关路由。
- 组件 API 使用窄而清晰的 TypeScript 类型，保持可组合；视图组件优先接收 View Model/Props，不要直接暴露 tRPC 或 Drizzle 模型。
- 功能专属图片和资源靠近功能目录；图片渲染遵循 Next.js 的图片约定。

## 注释与文档规范

- 注释统一使用中文；代码中的库名、API 名、类型名、路径和必要的领域术语保留英文原文。
- 注释解释“为什么这样做”、业务规则、边界条件、权限约束、缓存/副作用和不明显的技术取舍；不要逐行翻译代码或重复变量、函数、组件名称。
- 组件、Hook、Provider、Context、公开工具函数、Action、Query 和跨模块导出的类型/常量，必须使用 JSDoc 说明用途；复杂参数和返回值补充 `@param`、`@returns`，异常或权限要求补充 `@throws`、`@remarks`。
- React 组件的 JSDoc 放在导出声明前，重点说明组件职责、使用场景和关键 Props；不要为显而易见的 JSX 结构添加噪音注释。
- 业务规则、数据转换、权限判断、服务端/客户端边界和第三方库规避逻辑必须在代码附近说明原因，避免未来被误删或错误重构。
- 对临时方案使用统一格式：`TODO(负责人/主题): 说明待解决问题和完成条件`；禁止只写 `TODO`、`FIXME` 或无上下文的中文待办。已知缺陷优先建立 Issue，代码中保留可追踪链接或编号。
- 不在注释中记录会过期的实现细节、个人观点、审查对话、提交历史或“这里做了什么”式流水账；代码变更时必须同步删除失效注释。
- 不使用注释屏蔽 TypeScript、ESLint 或边界测试错误。确需使用 `eslint-disable`、`@ts-expect-error` 等抑制指令时，必须限定到最小范围，并在同一处说明原因和移除条件。
- 注释必须与当前 Server/Client Component、权限、数据流和目录结构保持一致；迁移文件或改变依赖方向时同步更新相关注释。
- 测试代码的注释只说明测试场景、特殊构造或反直觉断言；测试名称应优先表达行为，不能用注释替代清晰的测试名称。

## 大文件治理

- 生产代码单文件超过 300 行时，新增职责前必须先进行拆分评估；超过 600 行原则上不得继续堆叠新职责。
- 测试文件超过 500 行时，必须评估是否能按领域、行为、边界或测试夹具拆分；超过 1000 行应优先拆分。
- 拆分依据优先使用职责边界、依赖方向和测试行为，不按固定行数机械切割，也不为了降低行数制造无意义的包装文件。
- 数据库 Schema、Router、Provider 和入口文件可以作为统一出口保留较大体积，但具体表定义、Procedure、渲染器和状态逻辑应按领域或职责下沉。
- 拆分公共模块时必须保持现有导出路径兼容，必要时使用 `index.ts` 作为稳定出口；禁止通过循环依赖降低文件体积。
- 测试夹具、静态矩阵和测试执行器应分离管理；夹具文件只负责数据，测试文件只负责行为断言，AST 解析工具应独立于具体断言。
- 大文件优化必须补充或保留相邻测试，并至少执行类型检查、Lint、相关测试和全量测试；不得以拆分为理由降低覆盖率。

## 数据与状态放置

- 服务端拥有的数据优先在 Server Component 或服务端模块获取，再将可序列化的视图数据传给客户端组件。
- 交互式客户端数据访问使用 tRPC + TanStack Query。查询键、失效和错误处理放在功能 Hook 附近，不要塞进通用 UI 组件。
- 路由状态使用路由内 Hook，例如 `src/app/admin/hooks`、`src/app/(blog)/hooks`；只有多个路由区域共享时才提升。
- 跨组件状态优先使用作用域明确的 React Context/Provider；单页状态或服务端缓存不要引入 Zustand/全局状态。
- 外部输入在边界使用现有 Zod Schema 校验；UI 类型不能替代 API 校验。

## 前端任务流程

### 需求与变更流程

- 涉及需求澄清、架构调整、跨文件实现或行为变化时，统一使用 OpenSpec 的 SDD 流程（Propose → Apply → Archive）。
- 禁止使用 Superpowers 提供的 SDD/SSD 流程，也不要在同一项变更中混用两套需求、设计或任务文档体系。
- 需求、设计、规格和任务统一沉淀在 OpenSpec change 目录中；实现前先确认对应 change 的 proposal/design/tasks，完成后按 OpenSpec 流程验证和归档。
- OpenSpec 的 proposal、design、spec、tasks、变更说明和归档记录必须使用中文；代码符号、API 名称、文件路径、命令和必要的技术术语保留原文。
- 面向用户的分析、进度、验证结果和最终交付说明也统一使用中文，除非用户明确要求其他语言。
- 纯文件重命名、格式调整、单行注释修正等低风险维护可以直接修改，但仍需遵守本技能的目录、依赖和验证规范。

1. 先检查目标路由、最近的 layout/Provider、相邻组件、包边界测试、`package.json`、`tsconfig.json`、`components.json`，以及 `.next-docs` 中相关的 Next.js 本地文档。
2. 修改前确定所属层：路由编排、路由内功能、可复用 UI、领域契约、应用编排、基础设施适配器或 tRPC 传输层。
3. 优先复用现有组件、Hook、Provider 和 tRPC 模式，明确 Server/Client 边界。
4. 为行为变更补充相邻测试；只有架构边界有意变化时才调整架构测试。
5. 按影响范围验证：`bun run check-types`、`bun run lint`、聚焦的 `bunx vitest run <测试文件>`；路由、Provider、Bundle 或生产行为变化时补充更广泛测试和构建。
6. 检查 diff：依赖方向、客户端 Bundle 体积、重复 UI、客户端泄露密钥、无关格式化。

## 评审清单

- 代码是否放在最窄且正确的目录？
- 导入方向是否保持包边界？
- 是否有明确理由使用 Client Component？
- 认证、环境变量和外部输入是否在服务端边界完成校验？
- 是否复用了现有 UI、Provider、Hook 或 tRPC 模式？
- 是否覆盖加载、错误、空数据和无权限状态？
- 是否执行了与改动范围匹配的测试、类型检查和 lint？
