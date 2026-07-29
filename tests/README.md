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
| `src/app/sw.ts` | 该 service worker 入口由 Serwist 在构建时生成 |
| `src/packages/ui/components/**` | 未修改的 shadcn 基础组件；`extended` 和业务 UI 仍纳入统计 |

业务页面、hooks、services、权限、环境变量、sitemap、缓存和观测模块不得加入排除项。`tests/coverage-governance.test.ts` 会用实际 glob 结果审计这条边界。

全局门槛为 statements/lines 70%、functions 65%、branches 60%。权限、环境变量、脱敏、sitemap、缓存和观测核心采用逐文件 statements/lines 90%、branches 80% 门槛。Vitest 4.1.4 的顶层 `perFile` 会同时把全局门槛应用到每个文件，因此关键门槛使用“一文件一个精确 glob”；mutation 测试把一个真实关键文件门槛提高到 101%，验证 Vitest 会以失败状态退出。

### 2026-07-29 真实基线

在 `12a6009` 上按上述完整 include、仅排除声明/测试/生成 service worker/shadcn 基础 UI，并且尚未启用门槛时：63 个测试文件、510 个测试通过。

| 指标 | 基线 | 通过全局门槛还需覆盖 |
| --- | ---: | ---: |
| Statements | 42.80%（1533/3581） | 974 |
| Lines | 42.60%（1450/3403） | 933 |
| Functions | 39.85%（436/1094） | 276 |
| Branches | 34.35%（696/2026） | 520 |

基线中低于关键门槛的文件为 `src/env/server.ts`、`src/env/validation.ts`、`src/app/sitemap-data.ts`、`src/app/sitemap.xml/route.ts`、`src/app/sitemaps/[id]/route.ts`、`src/packages/trpc/api/utils/upstash-cache.ts`、`src/packages/observability/adapters/memory.ts` 和 `src/packages/observability/core/sanitize.ts`。补充分支与失败路径测试后，全部关键文件均通过逐文件 90/80 门槛。

补测后的完整结果为 statements 43.25%（1549/3581）、lines 43.02%（1464/3403）、functions 40.03%（438/1094）、branches 34.84%（706/2026）。coverage 命令当前只因四项全局门槛失败，剩余缺口分别为 statements 958、lines 919、functions 274、branches 510；主要集中在 DataTable/DynamicForm/Tiptap 等 extended UI、大型管理页面与列定义，以及 blog 页面和呈现组件。后续 DataTable 与管理 feature 拆分任务必须通过行为测试消化这些缺口，不得扩大 exclude 或降低门槛。

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
