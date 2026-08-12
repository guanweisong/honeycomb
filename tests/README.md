# 测试文档

## 测试结构

本项目采用业务代码就近原则组织测试文件：

### 📁 业务相关测试
测试文件直接放在对应的业务模块旁边，便于维护和理解：

```
src/packages/trpc/api/modules/
├── user/
│   ├── user.router.ts
│   └── user.router.test.ts     # 用户管理测试
├── post/
│   ├── post.router.ts
│   └── post.router.test.ts     # 文章管理测试
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

```bash
# 运行所有测试
bun test

# 运行特定模块测试
bun test src/packages/trpc/api/modules/user/user.router.test.ts

# 监听模式
bun test --watch

# 一次性运行
bun test --run

# 测试UI界面
bun test:ui
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

全局门槛为 statements/lines 70%、functions 65%、branches 60%。权限、环境变量、脱敏、sitemap、缓存和观测核心采用逐文件 statements/lines 90%、branches 80% 门槛。Vitest 4.1.4 的顶层 `perFile` 会同时把全局门槛应用到每个文件，因此关键门槛使用“一文件一个精确 glob”；mutation 测试把一个真实关键文件门槛提高到 101%，验证 Vitest 会以失败状态退出。

这套口径必须与 `vitest.config.ts` 同步维护：`include` 固定覆盖 `src/**/*.{ts,tsx}`；`exclude` 只允许上表中的声明、测试、E2E-only 薄入口、未修改 shadcn 基础组件和非生产测试资产。不得通过排除业务页面、feature hooks、services、权限或其他安全/基础设施核心来满足门槛。新增排除项必须同时给出可审查理由并更新 coverage governance 测试。

### 2026-07-29 真实基线

在 `12a6009` 上按上述完整 include、仅排除声明/测试/E2E-only service worker 薄入口/shadcn 基础 UI，并且尚未启用门槛时：63 个测试文件、510 个测试通过。

| 指标 | 基线 | 通过全局门槛还需覆盖 |
| --- | ---: | ---: |
| Statements | 42.80%（1533/3581） | 974 |
| Lines | 42.60%（1450/3403） | 933 |
| Functions | 39.85%（436/1094） | 276 |
| Branches | 34.35%（696/2026） | 520 |

基线中低于关键门槛的文件为 `src/env/server.ts`、`src/env/validation.ts`、`src/app/sitemap-data.ts`、`src/app/sitemap.xml/route.ts`、`src/app/sitemaps/[id]/route.ts`、`src/packages/trpc/api/utils/upstash-cache.ts`、`src/packages/infrastructure/observability/adapters/memory.ts` 和 `src/packages/infrastructure/observability/core/sanitize.ts`。补充分支与失败路径测试后，全部关键文件均通过逐文件 90/80 门槛。

补测后的完整结果为 statements 43.25%（1549/3581）、lines 43.02%（1464/3403）、functions 40.03%（438/1094）、branches 34.84%（706/2026）。coverage 命令当前只因四项全局门槛失败，剩余缺口分别为 statements 958、lines 919、functions 274、branches 510；主要集中在 DataTable/DynamicForm/Tiptap 等 extended UI、大型管理页面与列定义，以及 blog 页面和呈现组件。后续 DataTable 与管理 feature 拆分任务必须通过行为测试消化这些缺口，不得扩大 exclude 或降低门槛。

完成补测与模块化后，验收覆盖率为 statements 70.23%、lines 70.48%、functions 66.14%、branches 62.27%；全局门槛及全部关键文件门槛均通过。

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

- ✅ **User Router** - 用户管理（CRUD操作、权限验证）
- ✅ **Post Router** - 文章管理（基础功能测试）
- 🔄 **Other Routers** - 其他模块待补充测试

## 编写测试的注意事项

1. **ID格式**: 使用24位长度的字符串ID，符合 `IdSchema` 验证
2. **权限测试**: 管理员权限和普通用户权限的区分测试
3. **Mock设置**: 使用 `createMockDb()` 和 `createMockContext()` 工具函数
4. **错误处理**: 测试正常流程和异常情况

## 测试示例

参考现有的测试文件：
- `src/packages/trpc/api/modules/user/user.router.test.ts` - 用户管理测试
