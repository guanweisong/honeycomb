# Data and Contract Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收敛数据持久化、外部副作用和跨层类型的成功边界与唯一事实源，并用数据库约束和 CI 门禁阻止漂移回归。

**Architecture:** 数据库提交作为业务写入成功边界，公开缓存适配器在内部完成一次重试并以可判别结果报告降级。媒体保留存储优先的同步幂等删除，但显式返回数据库阶段不确定结果；数据库使用 CHECK/唯一索引执行关键不变量，Application schema 作为 Setting、Menu 和状态契约的权威来源。

**Tech Stack:** TypeScript、Next.js、tRPC、Zod、Drizzle ORM、SQLite/libSQL、Vitest、OpenSpec。

**Spec:** `openspec/changes/harden-data-and-contract-consistency/`

## Global Constraints

- 不新增 Outbox、Cron、消息队列、后台 worker 或第三方运行时依赖。
- 不连接或修改生产数据库；数据库测试使用本次运行独占的本地 `file:` SQLite 目录并在退出时清理。
- 不自动修复生产非法枚举、多 Setting 或其他歧义数据；迁移前置审计发现异常必须中止。
- 保持现有 tRPC 有效输入与正常成功响应兼容；媒体删除仅新增可判别的不确定结果。
- 生产代码必须遵循 `UI → Router → Use Case → Repository`，Application 不依赖 Next.js、tRPC、ORM 或对象存储实现。
- 每项行为修改严格执行 RED → GREEN → REFACTOR；未观察到预期失败前不得修改对应生产代码。
- 修改 Next.js API 前阅读 `node_modules/next/dist/docs/` 中对应版本文档。

---

### Task 1: 收敛 Setting 与 Menu 写入契约

**Files:**
- Create: `src/features/setting/application/write-schema.ts`
- Create: `src/features/menu/application/write-schema.ts`
- Modify: `src/features/setting/schemas/setting.update.schema.ts`
- Modify: `src/features/setting/application/repository.ts`
- Modify: `src/features/setting/infrastructure/setting-translations.ts`
- Modify: `src/features/menu/schemas/menu.update.schema.ts`
- Modify: `src/features/menu/application/repository.ts`
- Test: `tests/single-source-contracts.test.ts`
- Test: `tests/type-safety-governance.test.ts`
- Test: `tests/bounded-write-contracts.test.ts`

**Interfaces:**
- Consumes: `IdSchema`、本地化 schema、`HttpUrlSchema`、`MenuType`。
- Produces: `SettingAdminUpdateSchema`、`SettingPatchSchema`、`SettingPatch`、`MenuWriteSchema`、`MenuInput`。

- [ ] **Step 1: 写入失败测试**

在 `tests/single-source-contracts.test.ts` 断言 transport Setting/Menu schema 与 Application 权威实例相同，并在 `tests/type-safety-governance.test.ts` 断言 `MenuItem` 不存在开放索引签名。测试应包含：

```ts
expect(SettingTransportUpdate).toBe(SettingAdminUpdateSchema);
expect(MenuTransportUpdate).toBe(MenuWriteSchema);
expect(readFileSync("src/features/menu/application/repository.ts", "utf8"))
  .not.toMatch(/\[key:\s*string\]\s*:\s*unknown/);
```

- [ ] **Step 2: 运行 RED**

Run: `bun run test:unit:run -- tests/single-source-contracts.test.ts tests/type-safety-governance.test.ts`

Expected: FAIL，因为 Application schema 尚不存在，Menu 仍包含开放索引签名。

- [ ] **Step 3: 实现 Application 权威 schema**

`setting/application/write-schema.ts` 复用同一字段基础，明确区分后台表单与内部 patch：

```ts
const localizedSettingFields = {
  siteName: I18nSchema.partial(),
  siteSubName: I18nSchema.partial(),
  siteCopyright: I18nSchema.partial(),
  siteSignature: I18nSchema.partial(),
} as const;

export const SettingAdminUpdateSchema = z.object({
  id: IdSchema,
  ...localizedSettingFields,
  siteRecordNo: z.string().trim().nullable().optional(),
  siteRecordUrl: SettingRecordUrlSchema,
});

export const SettingPatchSchema = SettingAdminUpdateSchema.partial()
  .extend({
    id: IdSchema,
    siteName: NullableLocalizedInputSchema.optional(),
    siteSubName: NullableLocalizedInputSchema.optional(),
    siteCopyright: NullableLocalizedInputSchema.optional(),
    siteSignature: NullableLocalizedInputSchema.optional(),
  })
  .refine(hasUpdateFields, "至少修改一个字段");
```

Transport 文件只重导出 `SettingAdminUpdateSchema` 为既有 `SettingUpdateSchema` 名称。Repository 使用 `z.output<typeof SettingPatchSchema>`，不再从 `SettingRecord` 反推写入字段。

Menu Application 定义数组 schema，transport 重新导出同一实例；`MenuInput` 从 schema 推导并删除 `MenuItem` 的 `[key: string]: unknown`。

- [ ] **Step 4: 运行 GREEN 与相关契约测试**

Run: `bun run test:unit:run -- tests/single-source-contracts.test.ts tests/type-safety-governance.test.ts tests/bounded-write-contracts.test.ts src/features/setting/infrastructure/setting-repository.test.ts src/features/menu/application/menu-use-cases.test.ts`

Expected: PASS。

- [ ] **Step 5: 类型与差异检查**

Run: `bun run check-types && git diff --check`

Expected: PASS。

### Task 2: 收紧状态类型并统一 Comment 缓存端口

**Files:**
- Modify: `src/features/link/application/write-schema.ts`
- Modify: `src/features/link/application/repository.ts`
- Modify: `src/features/link/infrastructure/link-repository.ts`
- Modify: `src/features/category/application/write-schema.ts`
- Modify: `src/features/category/application/repository.ts`
- Modify: `src/features/category/infrastructure/category-repository.ts`
- Modify: `src/features/comment/application/comment-commands.ts`
- Modify: `src/packages/infrastructure/refresh-path.ts`
- Test: `tests/single-source-contracts.test.ts`
- Test: `src/features/comment/comment-command-handlers.test.ts`
- Test: `src/packages/infrastructure/refresh-path.test.ts`

**Interfaces:**
- Consumes: `EnableStatus`、`parseEnumValue`、`PublicContentInvalidator`。
- Produces: Link/Category 领域化状态字段；Comment 只依赖 `invalidate(plan)`。

- [ ] **Step 1: 写入失败测试**

新增测试证明 Link/Category schema 拒绝未知状态、Repository 读取未知状态失败，并扫描生产代码不存在 `invalidateContent` / `invalidateAll`：

```ts
expect(LinkInsertSchema.safeParse({ ...validLink, status: "BROKEN" }).success)
  .toBe(false);
expect(productionSource).not.toMatch(/\b(?:invalidateContent|invalidateAll)\b/);
```

Comment 行为测试期望以下计划：创建文章评论使用详情与布局，后台更新/删除只刷新布局。

- [ ] **Step 2: 运行 RED**

Run: `bun run test:unit:run -- tests/single-source-contracts.test.ts src/features/comment/comment-command-handlers.test.ts src/packages/infrastructure/refresh-path.test.ts`

Expected: FAIL，未知 Link 状态仍被接受且兼容端口仍存在。

- [ ] **Step 3: 实现最小收敛**

使用 `z.enum(EnableStatus)` 建立写入 schema；Repository DTO 使用 `EnableStatus`，Infrastructure 对数据库字符串调用 `parseEnumValue`。Comment 的依赖统一为：

```ts
invalidator: Pick<PublicContentInvalidator, "invalidate">;
```

创建评论调用：

```ts
await invalidator.invalidate({
  contents: [{ id: target.id, type: target.type }],
  refreshLayout: true,
});
```

自定义评论目标没有公开详情路径时只刷新布局。删除 `refresh-path.ts` 的兼容函数和对应测试替身。

- [ ] **Step 4: 运行 GREEN**

Run: `bun run test:unit:run -- tests/single-source-contracts.test.ts tests/write-contract-behavior.test.ts src/features/comment/comment-command-handlers.test.ts src/features/comment/tests/comment.router.test.ts src/packages/infrastructure/refresh-path.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交独立契约变更**

```bash
git add src/features/link src/features/category src/features/comment src/packages/infrastructure/refresh-path.ts tests/single-source-contracts.test.ts src/packages/infrastructure/refresh-path.test.ts
git commit -m "refactor(contracts): unify write boundaries"
```

### Task 3: 改造缓存失效成功边界

**Files:**
- Modify: `src/packages/application/public-content-invalidator.ts`
- Modify: `src/packages/infrastructure/refresh-path.ts`
- Modify: `src/packages/infrastructure/observability/core/names.ts`
- Modify: `src/packages/infrastructure/observability/core/metric-label-values.ts`
- Test: `src/packages/infrastructure/refresh-path.test.ts`
- Test: `src/features/post/application/post-commands.test.ts`
- Test: `src/features/page/application/page-use-cases.test.ts`
- Test: `src/features/setting/application/setting-use-cases.test.ts`
- Test: `src/features/link/application/link-use-cases.test.ts`

**Interfaces:**
- Produces: `PublicCacheInvalidationResult = { state: "completed" } | { state: "degraded" }`；`invalidate(plan): Promise<PublicCacheInvalidationResult>`；`MetricName.publicCacheInvalidationsTotal`。

- [ ] **Step 1: 写入失败测试**

在适配器测试加入：首次失败第二次成功调用底层两次并返回 completed；连续失败调用两次、记录一次降级指标和脱敏日志并返回 degraded。更新 Use Case 测试为数据库成功后失效器返回 degraded 时仍 resolve 原结果。

```ts
await expect(updateSetting(repository, input, {
  invalidate: vi.fn().mockResolvedValue({ state: "degraded" }),
})).resolves.toEqual(saved);
```

- [ ] **Step 2: 运行 RED**

Run: `bun run test:unit:run -- src/packages/infrastructure/refresh-path.test.ts src/features/post/application/post-commands.test.ts src/features/page/application/page-use-cases.test.ts src/features/setting/application/setting-use-cases.test.ts src/features/link/application/link-use-cases.test.ts`

Expected: FAIL，当前适配器第一次错误即抛出。

- [ ] **Step 3: 实现有限重试与观测**

把原始一次执行提取为 `executeInvalidationPlan(plan)`，公共 `invalidate` 解析一次输入后循环两次。新增 `LogEvent.cacheInvalidationDegraded`、`MetricName.publicCacheInvalidationsTotal`，并把 `invalidate` 加入 operation 目录、把 `completed | degraded` 加入 outcome 目录。连续失败时调用 `getLogger().error(LogEvent.cacheInvalidationDegraded, { operation: "invalidate", outcome: "degraded" })` 和 `getMetrics().increment(MetricName.publicCacheInvalidationsTotal, { operation: "invalidate", outcome: "degraded" })`，不记录 plan、内容 ID、path、key 或原始错误消息；成功记录 `outcome: "completed"`。

```ts
for (let attempt = 1; attempt <= 2; attempt += 1) {
  try {
    await executeInvalidationPlan(plan);
    return { state: "completed" } as const;
  } catch {
    if (attempt === 2) {
      recordInvalidationDegraded();
      return { state: "degraded" } as const;
    }
  }
}
```

- [ ] **Step 4: 运行 GREEN 和全体写入用例测试**

Run: `bun run test:unit:run -- src/packages/infrastructure/refresh-path.test.ts src/features/*/application/*use-cases.test.ts src/features/post/application/post-commands.test.ts src/features/comment/comment-command-handlers.test.ts`

Expected: PASS；Repository 失败测试仍证明 invalidator 未调用。

- [ ] **Step 5: 提交缓存边界变更**

```bash
git add src/packages/application/public-content-invalidator.ts src/packages/infrastructure/refresh-path.ts src/packages/infrastructure/observability src/features/*/application/*.test.ts
git commit -m "fix(cache): preserve committed write results"
```

### Task 4: 精确表达媒体删除不确定结果

**Files:**
- Create: `src/features/media/application/delete-result.ts`
- Modify: `src/features/media/application/media-use-cases.ts`
- Modify: `src/features/media/shared/actions/media-actions.ts`
- Test: `src/features/media/application/media-use-cases.test.ts`
- Test: `src/features/media/shared/actions/media-upload-outcomes.test.ts`
- Test: `src/features/media/shared/MediaPageShell/index.test.tsx`

**Interfaces:**
- Produces: `MediaDeleteResult = { success: true } | { success: false; state: "indeterminate"; message: string }`。

- [ ] **Step 1: 写入失败测试**

修改现有“数据库删除失败后重试”测试：第一次调用不再 rejects，而是返回 indeterminate；第二次仍可成功。客户端 action 测试期望 indeterminate 状态触发 refetch 并显示“删除结果待确认，请刷新后重试”。

- [ ] **Step 2: 运行 RED**

Run: `bun run test:unit:run -- src/features/media/application/media-use-cases.test.ts src/features/media/shared/actions/media-upload-outcomes.test.ts src/features/media/shared/MediaPageShell/index.test.tsx`

Expected: FAIL，当前数据库异常直接抛出且客户端只有 success/noop/error。

- [ ] **Step 3: 实现可判别结果**

仅包围 `deleteRecords` 阶段：

```ts
try {
  const result = await repository.deleteRecords(targetIds);
  await invalidator.invalidate(mediaDeletionInvalidation);
  return result;
} catch {
  return {
    success: false,
    state: "indeterminate",
    message: "删除结果待确认，请刷新媒体列表后重试",
  } as const;
}
```

对象存储异常继续抛出；空目标重试仍执行缓存修复。客户端 `submitMediaDelete` 保留 error，并新增 indeterminate 分支。

- [ ] **Step 4: 运行 GREEN**

Run: `bun run test:unit:run -- src/features/media/application/media-use-cases.test.ts src/features/media/shared/actions/media-upload-outcomes.test.ts src/features/media/shared/MediaPageShell/index.test.tsx tests/public-cache-invalidation-boundaries.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交媒体边界变更**

```bash
git add src/features/media
git commit -m "fix(media): report indeterminate deletions"
```

### Task 5: 为数据库不变量增加失败探针与 schema 约束

**Files:**
- Create: `src/packages/infrastructure/db/constraint-helpers.ts`
- Modify: `src/packages/infrastructure/db/schema/content.ts`
- Modify: `src/packages/infrastructure/db/schema/auth.ts`
- Test: `tests/persistence-integrity.test.ts`
- Test: `src/packages/infrastructure/db/schema.test.ts`

**Interfaces:**
- Produces: `enumCheck(column, values)` 或等价的只接受权威只读值集合的 helper；Setting `singletonKey` 内部列。

- [ ] **Step 1: 写入失败的隔离数据库测试**

测试通过 migrations 创建临时数据库，参数化尝试写入：未知 Link/Post/Page/Comment/User 状态、负媒体 size/width/height、负 views、零目标/多目标评论、第二条 Setting。每个断言期望 `SQLITE_CONSTRAINT_CHECK` 或 `SQLITE_CONSTRAINT_UNIQUE`。

- [ ] **Step 2: 运行 RED 并确认临时目录清理**

使用 `test-database-safety` 规定的 `mktemp -d`、trap、本地 `file:` URL 和测试 token 运行：

Run: `bun run test:unit:run -- tests/persistence-integrity.test.ts`

Expected: FAIL，因为现有 migrations 接受这些记录；命令结束后临时目录不存在。

- [ ] **Step 3: 修改 Drizzle schema**

为以下字段添加从权威目录派生的 CHECK：

- `category.status`、`post.status/type/commentStatus`、`page.status/template`、`comment.status`、`link.status`；
- `menu.type`、`postTag.type`；
- `user.level/status`、`loginHistory.event`；
- `post.views >= 0`、`page.views >= 0`、`media.size >= 0`、nullable width/height 非负；
- 评论 `(post_id IS NOT NULL) + (page_id IS NOT NULL) + (custom_id IS NOT NULL) = 1`；
- Setting `singletonKey` 默认 1、CHECK 等于 1、唯一索引。

Schema helper 必须从 `Object.values` 或 readonly tuple 构造 SQL，不复制 TypeScript 枚举成员。

- [ ] **Step 4: 更新 schema 单元测试**

检查 CHECK 名称、Setting 单例列和唯一索引均稳定存在，并保留现有 FK、默认值与关系测试。

- [ ] **Step 5: 暂不运行 GREEN**

此时 migrations 尚未生成，`persistence-integrity.test.ts` 必须继续失败。这证明测试验证的是部署产物而不是仅验证源码对象。

### Task 6: 生成安全迁移并增加前置数据审计

**Files:**
- Create: `scripts/audit-persistence-invariants.ts`
- Create: `tests/audit-persistence-invariants.test.ts`
- Create: `drizzle/0003_enforce_persistence_invariants.sql`
- Create: `drizzle/meta/0003_snapshot.json`
- Modify: `drizzle/meta/_journal.json`
- Modify: `scripts/migrate-database.ts`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`

**Interfaces:**
- Produces: 只读 `findPersistenceInvariantViolations(client)`；`db:invariants:audit` 脚本。

- [ ] **Step 1: 写入审计失败测试**

构造只含数量的 fake/隔离 DB 结果，验证非法数据返回 `{ table, field, count }`，不包含原始值、email、URL、token 或内容；合法数据库返回空列表。验证迁移入口在审计非空时不调用 `migrate`。

- [ ] **Step 2: 运行 RED**

Run: `bun run test:unit:run -- tests/audit-persistence-invariants.test.ts`

Expected: FAIL，因为审计脚本尚不存在。

- [ ] **Step 3: 实现只读审计**

所有语句限制为 SELECT/PRAGMA；每项只返回 count。`migrate-database.ts` 在迁移前运行审计，并在违规时输出表、字段、数量后中止。空数据库缺少目标表时允许继续到 baseline；现有数据库必须完成审计。

- [ ] **Step 4: 生成迁移**

加载本地哨兵环境，只执行项目既有 Drizzle generate；审查 SQLite 表重建、数据复制顺序、FK、索引、CHECK 和 Setting singleton column。不得运行 `drizzle-kit push`。

Run: `TURSO_URL=file:/private/tmp/honeycomb-generate.db TURSO_TOKEN=local-generation-sentinel bunx drizzle-kit generate --name enforce_persistence_invariants`

Expected: 新增且仅新增一组 SQL/Snapshot/Journal 工件。

- [ ] **Step 5: 运行迁移 GREEN**

在独占临时数据库中运行：

Run: `bun run test:unit:run -- tests/audit-persistence-invariants.test.ts tests/persistence-integrity.test.ts tests/translation-repository-writes.test.ts tests/relational-integrity.test.ts tests/normalized-translations-migration.test.ts`

Expected: PASS；临时目录清理完成。

- [ ] **Step 6: 提交数据库不变量变更**

```bash
git add src/packages/infrastructure/db scripts package.json .github/workflows/quality.yml drizzle tests
git commit -m "feat(db): enforce persistence invariants"
```

### Task 7: 加强迁移与 Feature 边界门禁

**Files:**
- Modify: `scripts/check-migrations.ts`
- Modify: `tests/database-migration-governance.test.ts`
- Modify: `tests/feature-boundaries.test.ts`
- Modify: `tests/single-source-contracts.test.ts`
- Modify: `.codex/skills/frontend-structure/references/quality.md`
- Modify: `.codex/skills/type-safety-governance/SKILL.md`

**Interfaces:**
- Produces: `findMigrationGovernanceErrors` 的 SQL/Journal/Snapshot 双向检查和隔离重放结构检查；全目录跨 Feature 导入检测。

- [ ] **Step 1: 写入迁移门禁失败测试**

分别传入：多余 SQL、缺失 Snapshot、跳号 Journal、tag/文件名不一致、重放结构差异。每种情况必须返回包含具体文件或结构字段的错误。

- [ ] **Step 2: 写入 Feature 边界失败夹具**

把导入解析提取为纯函数或在测试内注入源文本，覆盖其他 Feature 的 `domain`、`infrastructure`、`schemas`、`presentation` 导入均失败，`features/contracts` 与 `/public` 成功。

- [ ] **Step 3: 运行 RED**

Run: `bun run test:unit:run -- tests/database-migration-governance.test.ts tests/feature-boundaries.test.ts tests/single-source-contracts.test.ts`

Expected: FAIL，现有检查只验证 Journal → SQL 且 Feature 正则未覆盖全部目录。

- [ ] **Step 4: 实现双向工件检查与结构重放**

扩展输入模型包含 snapshotFiles/journal indexes。运行态门禁使用独占临时目录创建两个数据库：一个重放仓库 migrations；另一个执行 `bunx drizzle-kit generate --config drizzle.config.ts --out <临时目录>/current --name current_schema` 生成的从零迁移。复用 `normalizeSchemaInventory` 比较两者结构，并确保 finally 清理 client 和目录。

- [ ] **Step 5: 实现跨 Feature 导入门禁**

基于每个文件的 `src/features/<source>` 路径和 import specifier 的 `@/features/<target>/<segment>` 解析；source=target、target=contracts、segment=public 允许，其余内部 segment 拒绝。测试文件继续排除生产边界扫描。

- [ ] **Step 6: 更新技能文档和运行 GREEN**

Run: `bun run db:migrations:check && bun run test:unit:run -- tests/database-migration-governance.test.ts tests/feature-boundaries.test.ts tests/single-source-contracts.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交治理门禁变更**

```bash
git add scripts/check-migrations.ts tests/database-migration-governance.test.ts tests/feature-boundaries.test.ts tests/single-source-contracts.test.ts .codex/skills
git commit -m "test(architecture): close consistency gaps"
```

### Task 8: 同步 OpenSpec 并完成全量验证

**Files:**
- Modify: `openspec/changes/harden-data-and-contract-consistency/tasks.md`
- Create: `openspec/changes/harden-data-and-contract-consistency/verification.md`

**Interfaces:**
- Consumes: 所有前序任务的测试和迁移工件。
- Produces: 完整验证记录与全部勾选的 OpenSpec tasks。

- [ ] **Step 1: 运行类型和静态质量门禁**

Run: `bun run check-types && bun run lint && bun run db:migrations:check && git diff --check`

Expected: 全部退出码 0。

- [ ] **Step 2: 运行完整测试与覆盖率**

在 `test-database-safety` 独占临时目录、明确本地 `file:` URL 和清理 trap 下运行：

Run: `bun run test:unit:run && bun run test:unit:coverage && bun run test:unit:process`

Expected: 所有测试通过、覆盖率满足现有阈值、临时目录和子进程均已清理。

- [ ] **Step 3: 运行生产构建**

先阅读当前 Next.js 本地文档，再使用项目 CI 相同的哨兵环境运行 `bun run build`。

Expected: 构建退出码 0，未连接真实数据库或外部服务。

- [ ] **Step 4: 验证 OpenSpec 与差异**

Run: `openspec validate "harden-data-and-contract-consistency" --strict && git diff --check && git status --short`

Expected: OpenSpec valid；只包含本变更预期文件。

- [ ] **Step 5: 写入验证报告并勾选任务**

`verification.md` 必须记录命令、退出结果、测试数量、临时资源清理、未执行的生产只读审计以及部署前备份/批准要求。同步勾选 `tasks.md`，不得把未执行的生产检查标为完成。

- [ ] **Step 6: 最终提交**

```bash
git add openspec/changes/harden-data-and-contract-consistency
git commit -m "docs(architecture): verify consistency hardening"
```
