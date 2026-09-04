# Production Schema Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以当前生产 Turso 结构建立可版本化、可重建且不会误重放到现有生产库的 Drizzle baseline。

**Architecture:** 生产 introspection 只写入临时目录，先生成结构清单和差异报告，再替换未追踪的本地迁移。正式 baseline 在空 LibSQL 数据库验证；现有生产 migration ledger 写入与代码实现分离并保留人工审批。

**Tech Stack:** Drizzle Kit 0.31、Drizzle ORM、Turso/LibSQL、Bun、Vitest、GitHub Actions

**Spec:** `openspec/changes/version-production-schema-baseline/design.md`

## Global Constraints

- 生产 introspection MUST 只读，不得执行 push、migrate 或任意 DDL/DML。
- 现有生产库 MUST 不重放初始化 baseline。
- ledger 写入 MUST 在实现完成后再次获得用户明确批准。
- `drizzle/` 中 SQL、snapshot 和 journal MUST 进入版本控制。

---

### Task 1: 建立迁移治理门禁

**Files:**
- Create: `tests/database-migration-governance.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Git tracked-file state and `src/packages/infrastructure/db/schema/**/*.ts`
- Produces: repository test enforcing tracked migrations and schema/migration co-change

- [ ] **Step 1: 写入失败测试**

```ts
it("tracks Drizzle migration artifacts", () => {
  expect(gitFiles).toContain("drizzle/meta/_journal.json");
  expect(gitFiles.some((file) => /^drizzle\/\d+.*\.sql$/.test(file))).toBe(true);
});
```

- [ ] **Step 2: 验证红灯**

Run: `bunx vitest run tests/database-migration-governance.test.ts`
Expected: FAIL because `drizzle/` is ignored and no migration is tracked.

- [ ] **Step 3: 仅移除 `.gitignore` 中的 `drizzle` 行**

同时让测试检查 CI 存在 `bun run db:migrations:check`，但暂不伪造迁移文件。

- [ ] **Step 4: 保留测试红灯直到 baseline 生成**

Run: `bunx vitest run tests/database-migration-governance.test.ts`
Expected: FAIL only for missing tracked artifacts/check script.

### Task 2: 只读获取并审查生产结构

**Files:**
- Create: `scripts/audit-production-schema.ts`
- Create: `docs/production-schema-baseline-report.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `TURSO_URL`, `TURSO_TOKEN`; queries `sqlite_master`, `pragma_table_info`, `pragma_index_list`, `pragma_foreign_key_list`
- Produces: deterministic Markdown/JSON structural report without row data or secrets

- [ ] **Step 1: 为报告规范化函数写失败测试**

Create `scripts/audit-production-schema.test.ts` with fixtures proving stable ordering and redaction of URLs/tokens.

- [ ] **Step 2: 运行红灯测试**

Run: `bunx vitest run scripts/audit-production-schema.test.ts`
Expected: FAIL because `normalizeSchemaInventory` does not exist.

- [ ] **Step 3: 实现只读 inventory 与差异输出**

脚本只允许 `SELECT`/`PRAGMA`，遇到其他 statement 立即抛错；报告只包含对象名称和定义，不包含业务行数据。

- [ ] **Step 4: 使用 `.env` 只读运行审计**

Run: `bun run db:schema:audit`
Expected: writes reviewed report only; production schema/data unchanged.

- [ ] **Step 5: 人工核对代码 schema 差异**

逐项处理表、列、默认值、唯一约束、索引和外键差异；报告必须明确写出 `No unresolved differences` 才能继续。

### Task 3: 重新建立 baseline

**Files:**
- Replace: `drizzle/*.sql`
- Replace: `drizzle/meta/*.json`
- Modify: `drizzle.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: reviewed production schema inventory
- Produces: one initialization baseline plus valid Drizzle journal

- [ ] **Step 1: 记录旧迁移文件名和 SHA-256 摘要**

Run: `shasum -a 256 drizzle/*.sql`
Expected: report captures provenance without treating the files as deployable history.

- [ ] **Step 2: 删除已确认放弃的未追踪旧迁移**

只删除明确列入报告的 `drizzle/*.sql` 和 `drizzle/meta/*.json`，保留目录本身。

- [ ] **Step 3: 从已审查结构生成初始化 baseline**

Run: `bunx drizzle-kit generate --name production_baseline`
Expected: exactly one baseline SQL and matching snapshot/journal are generated.

- [ ] **Step 4: 在全新临时 LibSQL 数据库执行 baseline**

使用 `mktemp -d` 创建隔离目录，将 `TURSO_URL` 指向临时数据库，运行版本化 migrate；不得复用生产 URL。

- [ ] **Step 5: 反向生成 inventory 并比较**

Run: `bun run db:schema:audit -- --local <temporary-db-url>`
Expected: table/column/index/foreign-key inventory equals the reviewed production baseline.

### Task 4: 接入 CI 和文档

**Files:**
- Create: `scripts/check-migrations.ts`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `README.md`
- Create: `docs/database-migration-runbook.md`

**Interfaces:**
- Produces: `db:migrations:check`, `db:migrate`, documented baseline adoption procedure

- [ ] **Step 1: 完成治理测试所需脚本**

`db:migrations:check` 检查 journal 引用文件存在、迁移文件被 Git 跟踪，并在 PR diff 中 schema 变化却无 migration 变化时失败。

- [ ] **Step 2: 将检查加入 CI**

在 build 前运行 `bun run db:migrations:check`；不得在普通 CI 中连接生产数据库。

- [ ] **Step 3: 写运行手册**

明确新环境执行 baseline、生产只运行后续 migrate、备份和 ledger 接管命令；ledger 章节标记“执行前需要明确批准”。

- [ ] **Step 4: 跑完整验证**

Run: `bun run db:migrations:check && bun run check-types && bun run lint && bun run test:unit:run && git diff --check`
Expected: PASS.

- [ ] **Step 5: 更新 OpenSpec tasks 并提交**

Commit: `chore(db): version production schema baseline`
