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
只有跨模块的通用测试工具和配置才放在 `tests/` 目录：

```
tests/
├── setup/
│   └── vitest.setup.ts        # 全局测试设置
├── helpers/
│   └── test-utils.ts         # 通用测试工具
└── README.md                 # 测试文档
```

## 运行测试

架构边界专项检查：

```bash
bunx vitest run tests/feature-boundaries.test.ts tests/capability-entrypoint-boundaries.test.ts
```

它会检查 feature Application/transport 不直接访问数据库实现，并检查权限矩阵、菜单和管理
入口使用已登记的 capability。

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

## 覆盖率治理

`bun run test:unit:coverage` 显式统计 `src/**/*.{ts,tsx}`，因此没有被测试导入的生产文件也会以零覆盖进入分母。以下是完整且可审计的排除清单：

| 排除项 | 理由 |
| --- | --- |
| `**/*.d.ts` | TypeScript 声明没有可执行行为 |
| `**/*.test.{ts,tsx}`、`**/*.spec.{ts,tsx}` | 测试是覆盖率证据，不是生产分母 |
| `tests/**` | 跨模块测试、fixture 和测试配置不是生产源码 |
| `src/app/sw.ts` | E2E-only service worker 薄入口；`/en/offline` 由 Serwist route 显式预缓存，PWA E2E 会真实注册 worker、切换离线并验证未缓存导航 fallback |
| `src/packages/ui/components/**` | 未修改的 shadcn 基础组件；`extended` 和业务 UI 仍纳入统计 |

业务页面、hooks、services、权限、环境变量、sitemap、缓存和观测模块不得加入排除项。`tests/coverage-governance.test.ts` 会用实际 glob 结果审计这条边界。

全局门槛为 statements/lines 70%、functions 65%、branches 60%。权限、环境变量、脱敏、sitemap、缓存和观测核心采用逐文件 statements/lines 90%、branches 80% 门槛。Vitest 4.1 的顶层 `perFile` 会同时把全局门槛应用到每个文件，因此关键门槛使用“一文件一个精确 glob”；mutation 测试把一个真实关键文件门槛提高到 101%，验证 Vitest 会以失败状态退出。

这套口径必须与 `vitest.config.ts` 同步维护：`include` 固定覆盖 `src/**/*.{ts,tsx}`；`exclude` 只允许上表中的声明、测试、E2E-only 薄入口、未修改 shadcn 基础组件和非生产测试资产。不得通过排除业务页面、feature hooks、services、权限或其他安全/基础设施核心来满足门槛。新增排除项必须同时给出可审查理由并更新 coverage governance 测试。

### 当前覆盖率基线（2026-08-21）

最近一次全量单元测试在当前工作树上执行：213 个测试文件通过、0 个测试文件跳过，940 个测试通过、0 个 TODO。

| 指标 | 基线 | 通过全局门槛还需覆盖 |
| --- | ---: | ---: |
 | Statements | 81.34%（3662/4502） | 已超过 70% |
 | Lines | 82.26%（3367/4093） | 已超过 70% |
 | Functions | 77.70%（1157/1489） | 已超过 65% |
 | Branches | 75.23%（1972/2621） | 已超过 60% |

关键文件仍使用逐文件 statements/lines 90%、branches 80% 门槛；本次覆盖率命令成功退出，说明全局门槛与关键文件门槛均通过。覆盖率仍存在分布不均：部分 Admin 页面入口、客户端 Shell、邮件组件和数据库 schema 的覆盖率较低，后续新增行为应优先补充这些模块的相邻测试，不得通过扩大 exclude 或降低门槛解决。

## 管理 feature 目录约定

管理页面采用 feature-local 垂直组织。路由 `page.tsx` 只负责组合 page shell；查询参数与 tRPC query 放在 `*Query.ts`，mutation、toast、刷新和对话框状态放在 `*Actions.ts`，列定义放在 `*Columns.tsx`，表单/对话框和媒体呈现各自独立，DTO 到表单值、保存 payload 等纯转换放在 `*Transforms.ts`。这些模块的测试与实现就近放置。

页面特有类型、状态和逻辑必须留在对应 feature 目录。只有至少两个 feature 已存在稳定、语义相同的消费者时，才允许上移为 shared；相似命名、预期复用或减少文件行数都不足以建立共享抽象。DataTable 保持共享 facade，内部状态、选择、表头、表体、工具栏和分页可独立测试，现有消费者继续使用同一 props 与泛型接口。

### 2026-07-30 重构等价性审计

审计基线为 `8932908`：它是首个模块化提交 `e4b3767` 的直接父提交；从质量门禁落地点 `12a6009` 到该基线，DataTable 与六个管理 feature 也没有代码差异。静态审计确认路由文件位置不变、`8932908..HEAD` 的 tRPC routers 与权限核心无差异、客户端 procedure/输入构造/输出消费一致，且基线生产代码中的用户文案均保留。focused unit/component tests 再验证抽取后的 query、actions、转换、capability 和呈现行为。Playwright 证据只按下表“实际 Playwright 子集”列记录；它不是每个 feature 全部交互的穷举，未覆盖的流程由静态基线对比与 focused tests 支撑等价性结论。

| 范围 | 静态契约对比 | focused unit/component 证据 | 实际 Playwright 子集 |
| --- | --- | --- | --- |
| DataTable | 公开 props、泛型及 import 不变；`onChange` 仍输出分页、排序、筛选参数 | `index.test.ts` 与 state/selection hook 测试覆盖参数、重置、禁用行、单选/全选、空态和错误重试 | 无专用 DataTable E2E 声明 |
| menu | `/admin/menu`；三个 admin query、`saveAll` 输入/输出消费和 `menuUpdate` guard 不变 | query/actions/transforms/editor/shell 测试覆盖固定输入、勾选、拖拽转换、保存 payload、反馈文案和 capability | 仅验证未登录访问重定向 `/admin/login`、登录按钮可见，且菜单编辑器文案未渲染；不覆盖拖拽或保存 |
| user | `/admin/user`；`index/create/update/destroy` 契约、`userManage` 和高权限目标保护结果不变 | query/actions/transforms/columns/shell 测试覆盖搜索参数、CRUD action 状态、表单映射、资源保护、列文案和 capability | RBAC spec 仅验证未登录时 shell/用户导航不出现，以及直接调用 `user.index` 返回 401 `UNAUTHORIZED` 且不泄露 email；不覆盖用户 CRUD |
| link | `/admin/link`；`adminIndex/create/update/destroy` 契约和 create/update/delete 三个 capability guard 不变 | query/actions/transforms/columns/shell 测试覆盖搜索参数、CRUD action 状态、表单 payload、列文案和 capability | 仅验证未登录访问重定向 `/admin/login`、登录按钮可见，且“添加链接”“批量删除”未渲染；不覆盖链接 CRUD |
| media | `/admin/media`；`index/getPresignedUrl/upload/destroy` 契约和 upload/delete guard 不变 | query/actions/grid/shell 测试覆盖列表输入、元数据上传、失败状态、选择、删除和 capability | 使用 mocked tRPC/storage 的浏览器契约验证预签名输入、PUT body/content-type、upload payload、成功文案和删除 `{ ids }`；不代表真实后端/对象存储集成 |
| page edit | `/admin/page/edit?id=...`；`adminDetail/create/update` 契约和 create/update guard 不变 | query/actions/transforms/buttons 测试覆盖 id/DTO 映射、创建/更新状态、失败、权限、草稿/发布/撤回按钮 | 使用 mocked tRPC 的浏览器契约仅验证创建 `DRAFT` 后跳转带 id、重新查询 detail，再更新为 `PUBLISHED`；不覆盖撤回 |
| comment | `/admin/comment`；`index/update/destroy` 契约和 `commentModerate` guard 不变 | query/actions/columns/shell 测试覆盖筛选、状态/删除 action、失败、状态文案和 capability | 使用 mocked tRPC 的浏览器契约仅验证 `TO_AUDIT` 通过为 `PUBLISH`、刷新呈现和批量删除；不覆盖驳回、屏蔽、解禁、搜索或单删 |

## 测试覆盖的模块

当前测试覆盖包括认证与权限、tRPC Router、应用层查询与命令、环境变量、安全头、输入清理、限流、缓存、可观测性、sitemap、Blog 页面、Admin feature 和 UI extended 组件。具体覆盖率以 `bun run test:unit:coverage` 的终端报告及 `coverage/` 产物为准；不要在此维护容易过期的模块勾选清单。

## 编写测试的注意事项

1. **ID格式**: 使用24位长度的字符串ID，符合 `IdSchema` 验证
2. **权限测试**: 管理员权限和普通用户权限的区分测试
3. **Mock设置**: 使用 `createMockDb()` 和 `createMockContext()` 工具函数
4. **错误处理**: 测试正常流程和异常情况

## 测试示例

参考现有的测试文件：
- `src/features/user/tests/user.router.test.ts` - 用户管理测试
