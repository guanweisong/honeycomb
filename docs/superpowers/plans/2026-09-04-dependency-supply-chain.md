# Dependency Supply Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除可修复的生产依赖漏洞，并让未登记或过期的生产 High/Critical 风险阻断 CI。

**Architecture:** 用 Bun JSON 审计输出作为输入，以项目脚本按 production dependency path 和精确例外判断结果。依赖按富文本、数据库/网络、客户端和开发工具分批升级，每批独立回归。

**Tech Stack:** Bun audit、TypeScript、Vitest、GitHub Actions、sanitize-html、Tiptap

**Spec:** `openspec/changes/harden-dependency-supply-chain/design.md`

## Global Constraints

- 生产可达 High/Critical MUST 修复或匹配未过期的精确例外。
- 允许必要的主版本升级或依赖替换，但公开 API 和产品行为 MUST 保持兼容。
- 例外 MUST 包含 advisory、精确依赖路径、补偿措施、负责人和到期日。

---

### Task 1: 建立机器可读审计门禁

**Files:**
- Create: `scripts/audit-production-dependencies.ts`
- Create: `scripts/dependency-audit-exceptions.json`
- Create: `scripts/audit-production-dependencies.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Bun audit JSON and `package.json` dependency classification
- Produces: exit code 1 for unmatched/expired production High/Critical advisories

- [ ] **Step 1: 写失败测试**

```ts
expect(evaluateAudit(highRuntimeFixture, [], today).blocking).toHaveLength(1);
expect(evaluateAudit(highRuntimeFixture, [validException], today).blocking).toEqual([]);
expect(evaluateAudit(highRuntimeFixture, [expiredException], today).blocking).toHaveLength(1);
```

- [ ] **Step 2: 验证红灯**

Run: `bunx vitest run scripts/audit-production-dependencies.test.ts`
Expected: FAIL because evaluator is absent.

- [ ] **Step 3: 实现严格 evaluator**

定义固定 `AuditException` 结构，拒绝通配 advisory、通配路径、缺失 owner/mitigation/expiresOn 及已过期记录。

- [ ] **Step 4: 接入脚本命令**

Add `audit:production` to run Bun audit JSON through the evaluator; raw parser failures must fail closed.

### Task 2: 升级富文本安全链

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify if required: `src/packages/infrastructure/security/sanitize-html.ts`
- Test: `src/packages/infrastructure/security/sanitize-html.test.ts`
- Test: `src/packages/ui/extended/Tiptap/**/*.test.ts`

**Interfaces:**
- Consumes: existing sanitizer allowlist and editor extensions
- Produces: fixed dependency versions with unchanged safe rendering contract

- [ ] **Step 1: 添加公告触发模式回归测试**

加入 SVG/SMIL URI、`__proto__` 属性、危险协议和事件属性输入；预期输出不得包含可执行 URL/属性。

- [ ] **Step 2: 验证测试能约束当前行为**

Run: `bunx vitest run src/packages/infrastructure/security/sanitize-html.test.ts src/packages/ui/extended/Tiptap`
Expected: existing security expectations pass; dependency audit remains red.

- [ ] **Step 3: 升级 `sanitize-html` 和全部 `@tiptap/*` 到含修复版本**

使用 `bun add` 保持 Tiptap 族版本一致，不混用多个 minor。

- [ ] **Step 4: 运行富文本聚焦回归**

Run: same focused Vitest command plus `bun run check-types`.
Expected: PASS and relevant advisories disappear.

### Task 3: 治理其余生产依赖链

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `scripts/dependency-audit-exceptions.json`
- Modify: `docs/dependency-audit-exceptions.md`

**Interfaces:**
- Consumes: current Bun audit paths
- Produces: zero unexcepted production High/Critical findings

- [ ] **Step 1: 升级数据库和网络运行时依赖**

优先升级 `@libsql/client` 及其 `ws`/`undici` 路径，运行数据库、认证和 query adapter 测试。

- [ ] **Step 2: 升级客户端运行时依赖**

处理 `ahooks`/Lodash、Recharts、主题切换链路；无法修复且未实际使用的顶层依赖应替换或删除。

- [ ] **Step 3: 分类开发工具漏洞**

升级 Vite/Vitest、ESLint、PostCSS、Sass、Serwist 可兼容版本；仅 dev-only 且无修复的路径进入精确例外。

- [ ] **Step 4: 运行生产审计**

Run: `bun run audit:production`
Expected: PASS with every remaining exception printed by advisory/path/expiry.

### Task 4: CI 与全量验证

**Files:**
- Modify: `.github/workflows/quality.yml`
- Modify: `tests/quality-workflow.test.ts`
- Modify: `openspec/changes/harden-dependency-supply-chain/tasks.md`

- [ ] **Step 1: 先更新质量工作流测试**

测试要求 CI 包含 `bun run audit:production` 且不再包含 `bun audit --audit-level=critical`。

- [ ] **Step 2: 验证红灯后修改 CI**

Run: `bunx vitest run tests/quality-workflow.test.ts`
Expected before CI edit: FAIL; after edit: PASS.

- [ ] **Step 3: 跑完整验证**

Run: `bun run audit:production && bun run check-types && bun run lint && bun run test:unit:run && bun run test:unit:coverage`
Run build with the repository's documented build-only environment.
Expected: all PASS.

- [ ] **Step 4: 更新 OpenSpec tasks 并提交**

Commit: `fix(deps): harden production audit policy`
