# 测试文档

## 测试结构

本项目采用业务代码就近原则组织测试文件：

### 📁 业务相关测试

测试文件直接放在对应的业务模块旁边，便于维护和理解：

```
src/features/
├── user/
│   └── tests/user.router.test.ts # 用户管理测试
├── post/
│   └── tests/post.router.test.ts # 文章管理测试
└── ...
```

### 📁 通用测试

根目录按被验证职责浅分组，不按文件后缀或是否使用数据库推断测试运行环境。业务与技术模块的相邻测试继续留在 `src/`；测试库存随回归补充，进程分组与覆盖率门槛以当前配置为准。

`tests/` 放置跨 feature 回归、架构与安全门禁、E2E，以及共享测试工具和配置；单一模块的行为测试通常与实现相邻：

```
tests/
├── architecture/            # 职责、类型、安全与运行时依赖门禁
├── integration/             # 跨模块行为、持久化与框架组合回归（部分使用 mock）
├── tooling/                 # 构建、配置、脚本与测试治理
├── e2e/                     # 真实开发/生产浏览器流程
├── fixtures/                # 边界测试夹具
├── setup/                   # 全局测试设置
├── helpers/                 # 共享测试工具及其相邻测试
└── README.md
```

## 运行测试

架构边界专项检查：

```bash
bunx vitest run tests/architecture/feature-boundaries.test.ts tests/architecture/capability-entrypoint-boundaries.test.ts
```

它会检查 Feature Router 将业务操作交给所属 Feature 的 server.ts/server 模块、纯 schema/types/rules 不依赖持久化或 UI、共享组件不拥有业务，以及 lib 不反向编排业务。权限矩阵、菜单和管理入口继续使用已登记的 capability。

`tests/architecture/library-boundaries.test.ts` 还跟踪 Client Component 的传递依赖，覆盖 import、re-export、动态 import 与 require，阻止数据库、服务端认证、原生 SDK 和 Node 模块进入浏览器。类型导入单独识别；lib/trpc/client 对 app/_trpc/router 的纯类型引用不产生运行时依赖。

```bash
# 运行所有单元测试（监听模式）
bun run test:unit

# 运行特定模块测试
bunx vitest src/features/user/tests/user.router.test.ts

# 监听模式
bun run test:unit --watch

# 一次性运行
bun run test:unit:run

# 运行 Playwright UI 模式
bun run test:e2e:ui
```

## CI 执行与测试环境

E2E 的显式临时目录初始化、凭据隔离及清理契约见 [README 的 E2E 说明](../README.md#可用脚本)。包命令的 `scripts/e2e-preflight.ts` 只做参数和报告目的地预检，不替代现有 CI 生命周期或 Playwright 服务管理。普通筛选与诊断参数保持可用；配置、输出、源码更新及自定义 reporter 覆盖被拒绝。`--list` / `--help` 使用 stdout，不初始化数据库或启动服务。

CI 只运行一次普通单元测试清单：使用 `bun run test:unit:coverage` 同时验证断言和覆盖率，不再额外执行重复的 `test:unit:run`。五个进程级门禁文件继续通过 `bun run test:unit:process` 单独运行；测试清单、覆盖率排除项和门槛不因此缩减。本地仍可使用 `test:unit:run` 进行不采集覆盖率的快速验证。

默认环境仍为 `jsdom`，需要 DOM、浏览器 API 或 React 客户端渲染的测试保持不变。已核实只使用 Node API、纯领域逻辑或静态契约检查的文件，在文件顶部显式声明 `// @vitest-environment node`，避免不必要的 DOM 初始化。新增声明前应检查测试及其导入依赖，并在 Node 环境下执行验证，不按 `.ts` / `.tsx` 后缀自动分组。保留 Vitest 默认的文件隔离和现有 worker 上限。

## 覆盖率治理

`bun run test:unit:coverage` 显式统计 `src/**/*.{ts,tsx}`，因此没有被测试导入的生产文件也会以零覆盖进入分母。以下是完整且可审计的排除清单：

| 排除项                                     | 理由                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `**/*.d.ts`                                | TypeScript 声明没有可执行行为                                                                                                           |
| `**/*.test.{ts,tsx}`、`**/*.spec.{ts,tsx}` | 测试是覆盖率证据，不是生产分母                                                                                                          |
| `tests/**`                                 | 跨模块测试、fixture 和测试配置不是生产源码                                                                                              |
| `src/app/sw.ts`                            | E2E-only service worker 薄入口；`/en/offline` 由 Serwist route 显式预缓存，PWA E2E 会真实注册 worker、切换离线并验证未缓存导航 fallback |
| `src/components/ui/**`                     | 既有 shadcn 基础组件目录排除（含已定制的 tabs）；目录外扩展组件和业务 UI 仍纳入统计                                                                                  |

业务页面、hooks、Feature server/schema/rules、权限、环境变量、sitemap、缓存和观测模块不得加入排除项。`tests/tooling/coverage-governance.test.ts` 会用实际 glob 结果审计这条边界。

全局门槛为 statements/lines 70%、functions 65%、branches 60%。权限、环境变量、脱敏、sitemap、缓存和观测核心采用逐文件 statements/lines 90%、branches 80% 门槛。启用顶层 `perFile: true` 会把全局阈值改为逐文件检查，因此本工程保留全局汇总门槛，并用“一文件一个精确 glob”设置关键门槛；mutation 测试把一个真实关键文件门槛提高到 101%，验证 Vitest 会以失败状态退出。

这套口径必须与 `vitest.config.mts` 同步维护：`include` 固定覆盖 `src/**/*.{ts,tsx}`；`exclude` 只允许上表中的声明、测试、E2E-only 薄入口、上述既有 shadcn 基础组件目录和非生产测试资产。不得通过排除业务页面、feature hooks、server/schema/rules、权限或其他安全/基础设施核心来满足门槛。新增排除项必须同时给出可审查理由并更新 coverage governance 测试。

### 历史覆盖率快照（2026-09-13）

以下是 2026-09-13 的历史快照，不是当前简单架构迁移的验证结果：307 个测试文件通过、1469 项测试通过。进程级门禁另有 2 个测试文件、52 项测试通过。当前结果必须重新执行完整命令，以本次输出为准。

| 指标       |                基线 | 全局门槛 |
| ---------- | ------------------: | -------: |
| Statements | 85.79%（4350/5070） |      70% |
| Lines      | 87.03%（4088/4697） |      70% |
| Functions  | 84.08%（1426/1696） |      65% |
| Branches   | 77.93%（2427/3114） |      60% |

关键文件仍使用逐文件 statements/lines 90%、branches 80% 门槛；该历史覆盖率命令成功退出，说明全局门槛与关键文件门槛均通过。覆盖率仍存在分布不均：部分 Admin 页面入口、客户端 Shell、邮件组件和数据库 schema 的覆盖率较低，后续新增行为应优先补充这些模块的相邻测试，不得通过扩大 exclude 或降低门槛解决。

## 管理 feature 目录约定

管理页面采用 feature-local 组织，app 路由只负责框架与页面组合。按实际复杂度拆分查询输入、mutation/反馈、列定义、表单或纯转换，不要求固定命名后缀、目录模板或一行转发 helper；例如现有 `page-editor-actions.ts`、`page-editor-transforms.ts` 以真实职责命名。测试与相应实现就近放置。

页面特有类型、状态和逻辑必须留在对应 feature 目录。只有至少两个 feature 已存在稳定、语义相同的消费者时，才允许上移为 shared；相似命名、预期复用或减少文件行数都不足以建立共享抽象。DataTable 保持共享 facade，内部状态、选择、表头、表体、工具栏和分页可独立测试，消费者保持泛型接口，必须提供稳定业务 ID 的 `getRowId`。搜索通过表格列筛选状态更新；查询改变立即清选择，刷新按 ID 对齐当前记录，读取期间禁止改变选择，不以对象引用或数组索引作为业务身份。

### 2026-07-30 重构等价性审计

> 以下结论冻结于当时审计版本；其中 HEAD 指当时审计目标，不指当前分支。旧路径和接口描述是历史证据。本轮结果见[简单架构重构验证](../docs/simple-feature-architecture-results.md)。

审计基线为 `8932908`：它是首个模块化提交 `e4b3767` 的直接父提交；从质量门禁落地点 `12a6009` 到该基线，DataTable 与六个管理 feature 也没有代码差异。静态审计确认路由文件位置不变、`8932908..HEAD` 的 tRPC routers 与权限核心无差异、客户端 procedure/输入构造/输出消费一致，且基线生产代码中的用户文案均保留。focused unit/component tests 再验证抽取后的 query、actions、转换、capability 和呈现行为。Playwright 证据只按下表“实际 Playwright 子集”列记录；它不是每个 feature 全部交互的穷举，未覆盖的流程由静态基线对比与 focused tests 支撑等价性结论。

| 范围      | 静态契约对比                                                                                             | focused unit/component 证据                                                                                        | 实际 Playwright 子集                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| DataTable | 公开 props、泛型及 import 不变；`onChange` 仍输出分页、排序、筛选参数                                    | `index.test.ts` 与 state/selection hook 测试覆盖参数、重置、禁用行、单选/全选、空态和错误重试                      | 无专用 DataTable E2E 声明                                                                                                                         |
| menu      | `/admin/menu`；三个 admin query、`saveAll` 输入/输出消费和 `menuUpdate` guard 不变                       | query/actions/transforms/editor/shell 测试覆盖固定输入、勾选、拖拽转换、保存 payload、反馈文案和 capability        | 仅验证未登录访问重定向 `/admin/login`、登录按钮可见，且菜单编辑器文案未渲染；不覆盖拖拽或保存                                                     |
| user      | `/admin/user`；`index/create/update/destroy` 契约、`userManage` 和高权限目标保护结果不变                 | query/actions/transforms/columns/shell 测试覆盖搜索参数、CRUD action 状态、表单映射、资源保护、列文案和 capability | RBAC spec 仅验证未登录时 shell/用户导航不出现，以及直接调用 `user.index` 返回 401 `UNAUTHORIZED` 且不泄露 email；不覆盖用户 CRUD                  |
| link      | `/admin/link`；`adminIndex/create/update/destroy` 契约和 create/update/delete 三个 capability guard 不变 | query/actions/transforms/columns/shell 测试覆盖搜索参数、CRUD action 状态、表单 payload、列文案和 capability       | 仅验证未登录访问重定向 `/admin/login`、登录按钮可见，且“添加链接”“批量删除”未渲染；不覆盖链接 CRUD                                                |
| media     | `/admin/media`；`index/getPresignedUrl/upload/destroy` 契约和 upload/delete guard 不变                   | query/actions/grid/shell 测试覆盖列表输入、元数据上传、失败状态、选择、删除和 capability                           | 使用 mocked tRPC/storage 的浏览器契约验证预签名输入、PUT body/content-type、upload payload、成功文案和删除 `{ ids }`；不代表真实后端/对象存储集成 |
| page edit | `/admin/page/edit?id=...`；`adminDetail/create/update` 契约和 create/update guard 不变                   | query/actions/transforms/buttons 测试覆盖 id/DTO 映射、创建/更新状态、失败、权限、草稿/发布/撤回按钮               | 使用 mocked tRPC 的浏览器契约仅验证创建 `DRAFT` 后跳转带 id、重新查询 detail，再更新为 `PUBLISHED`；不覆盖撤回                                    |
| comment   | `/admin/comment`；`index/update/destroy` 契约和 `commentModerate` guard 不变                             | query/actions/columns/shell 测试覆盖筛选、状态/删除 action、失败、状态文案和 capability                            | 使用 mocked tRPC 的浏览器契约仅验证 `TO_AUDIT` 通过为 `PUBLISH`、刷新呈现和批量删除；不覆盖驳回、屏蔽、解禁、搜索或单删                           |

## 测试覆盖的模块

当前测试覆盖包括认证与权限、tRPC Router、Feature 服务端查询与写入操作、环境变量、安全头、输入清理、限流、缓存、可观测性、sitemap、Blog 页面、Admin feature 和 共享 UI 扩展组件。具体覆盖率以 `bun run test:unit:coverage` 的终端报告及 `coverage/` 产物为准；不要在此维护容易过期的模块勾选清单。

## 编写测试的注意事项

1. **ID格式**: 使用24位长度的字符串ID，符合 `IdSchema` 验证
2. **权限测试**: 管理员权限和普通用户权限的区分测试
3. **Mock设置**: 使用 `createMockDb()` 和 `createMockContext()` 工具函数
4. **错误处理**: 测试正常流程和异常情况

## 测试示例

参考现有的测试文件：

- `src/features/user/tests/user.router.test.ts` - 用户管理测试
