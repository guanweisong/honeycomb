# Application Side-Effect Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将公开缓存及其他业务副作用的顺序彻底收敛到 Application Use Case，使 Router 只承担传输适配和依赖组装。

**Architecture:** 在 `src/packages/application` 建立由 Zod Schema 推导的唯一缓存引用契约与最小 `PublicContentInvalidator` 端口；Next.js `revalidatePath` 只存在于 Infrastructure adapter。各 Feature 写入 Use Case 在 Repository 成功后调用端口，Router 只注入 adapter；评论通知、验证码和媒体存储保持既有 Application 编排，并由边界测试阻止回退。

**Tech Stack:** TypeScript 6、Zod 4、Next.js 16 App Router、tRPC 11、Vitest 4、Bun 1.4。

**Spec:** `openspec/changes/move-side-effects-to-application/design.md`

## Global Constraints

- 保持现有 tRPC 输入、输出、权限、缓存范围、邮件失败语义和媒体删除重试行为不变。
- Application 不得导入 Next.js、tRPC、数据库实现、对象存储 SDK、邮件 SDK 或 `src/packages/infrastructure`。
- API 限流、会话解析、入口 capability 鉴权和协议错误映射继续属于 transport。
- 数据库写入失败不得调用缓存端口；缓存失败继续在数据库提交后向调用方传播。
- 不引入领域事件、消息队列、Outbox、通用 Service 或兼容重载。
- 所有生产代码修改严格遵循 RED → GREEN → REFACTOR。

---

### Task 1: 建立缓存端口和 Next.js 适配器

**Files:**
- Create: `src/packages/application/public-content-invalidator.ts`
- Create: `src/packages/application/public-content-invalidator.test.ts`
- Modify: `src/packages/infrastructure/refresh-path.ts`
- Modify: `src/packages/infrastructure/refresh-path.test.ts`

**Interfaces:**
- Produces: `PublicContentReferenceSchema`、`PublicContentReference`、`PublicContentInvalidator`
- Produces: `publicContentInvalidator: PublicContentInvalidator`
- Consumes: `IdSchema`、`supportedLanguages`、Next.js `revalidatePath`

- [ ] **Step 1: 为 Application 唯一契约写失败测试**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  PublicContentReferenceSchema,
  type PublicContentInvalidator,
} from "./public-content-invalidator";

describe("PublicContentInvalidator", () => {
  it("只接受服务端结构化公开内容引用", () => {
    expect(PublicContentReferenceSchema.parse({ id: "123456789012345678901234", type: "post" }))
      .toEqual({ id: "123456789012345678901234", type: "post" });
    expect(() => PublicContentReferenceSchema.parse({ id: "short", type: "page" })).toThrow();
    expect(() => PublicContentReferenceSchema.parse({ id: "123456789012345678901234", type: "other" })).toThrow();
  });

  it("端口保持最小固定方法集合", async () => {
    const invalidator: PublicContentInvalidator = {
      invalidateContent: vi.fn(async () => undefined),
      invalidateAll: vi.fn(async () => undefined),
    };
    await invalidator.invalidateAll();
    expect(Object.keys(invalidator).sort()).toEqual(["invalidateAll", "invalidateContent"]);
  });
});
```

- [ ] **Step 2: 运行测试并确认 RED**

Run: `bunx vitest run src/packages/application/public-content-invalidator.test.ts`

Expected: FAIL，因为 `public-content-invalidator.ts` 尚不存在。

- [ ] **Step 3: 实现唯一契约**

```ts
import { z } from "zod";
import { IdSchema } from "@/packages/domain/shared/id.schema";

export const PublicContentReferenceSchema = z.object({
  id: IdSchema,
  type: z.enum(["post", "page"]),
});

export type PublicContentReference = z.infer<typeof PublicContentReferenceSchema>;

export interface PublicContentInvalidator {
  invalidateContent(reference: PublicContentReference): Promise<void>;
  invalidateAll(): Promise<void>;
}
```

- [ ] **Step 4: 将 Infrastructure 实现收敛为 adapter 对象**

在 `refresh-path.ts` 删除本地同义 Schema 和两个公开函数，保留私有实现并导出：

```ts
export const publicContentInvalidator: PublicContentInvalidator = {
  async invalidateContent(input) {
    const { id, type } = PublicContentReferenceSchema.parse(input);
    const segment = type === "post" ? "archives" : "pages";
    for (const locale of supportedLanguages) {
      revalidatePath(`/${locale}/${segment}/${id}`);
    }
    await invalidateAll();
  },
  invalidateAll,
};
```

更新 `refresh-path.test.ts` 通过 `publicContentInvalidator.invalidateContent` 和 `.invalidateAll` 验证原有路径、语言及非法引用行为。

- [ ] **Step 5: 运行聚焦测试并确认 GREEN**

Run: `bunx vitest run src/packages/application/public-content-invalidator.test.ts src/packages/infrastructure/refresh-path.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交端口与适配器**

```bash
git add src/packages/application/public-content-invalidator.ts src/packages/application/public-content-invalidator.test.ts src/packages/infrastructure/refresh-path.ts src/packages/infrastructure/refresh-path.test.ts
git commit -m "refactor(application): add cache invalidator port"
```

### Task 2: 迁移 Post 和 Page 定向缓存副作用

**Files:**
- Modify: `src/features/post/application/post-commands.ts`
- Create: `src/features/post/application/post-commands.test.ts`
- Modify: `src/features/post/post.router.ts`
- Modify: `src/features/post/tests/post.router.test.ts`
- Modify: `src/features/page/application/page-use-cases.ts`
- Create: `src/features/page/application/page-use-cases.test.ts`
- Modify: `src/features/page/page.router.ts`
- Modify: `src/features/page/tests/page.router.test.ts`

**Interfaces:**
- Consumes: `Pick<PublicContentInvalidator, "invalidateContent">`
- Produces: `createPost`、`destroyPosts`、`updatePost`、`updatePostTags` 和对应 Page 命令在成功写入后完成定向失效

- [ ] **Step 1: 写 Post/Page 用例失败测试**

每种目标至少覆盖一个成功和一个 Repository 失败场景；Post 批量删除额外验证全部 ID。示例：

```ts
it("更新成功后失效文章公开内容", async () => {
  const order: string[] = [];
  const repository = {
    findStatus: vi.fn(async () => PostStatus.DRAFT),
    update: vi.fn(async () => { order.push("repository"); return { id: POST_ID }; }),
  };
  const invalidator = {
    invalidateContent: vi.fn(async () => { order.push("cache"); }),
  };

  await updatePost(repository, { id: POST_ID }, invalidator);

  expect(order).toEqual(["repository", "cache"]);
  expect(invalidator.invalidateContent).toHaveBeenCalledWith({ id: POST_ID, type: "post" });
});

it("文章写入失败时不失效缓存", async () => {
  const invalidator = { invalidateContent: vi.fn() };
  await expect(createPost({ create: vi.fn().mockRejectedValue(new Error("db")) }, INPUT, AUTHOR_ID, invalidator))
    .rejects.toThrow("db");
  expect(invalidator.invalidateContent).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行用例测试并确认 RED**

Run: `bunx vitest run src/features/post/application src/features/page/application`

Expected: FAIL，因为命令尚不接受 invalidator 或尚未调用缓存端口。

- [ ] **Step 3: 修改写入命令的最小实现**

所有命令采用相同顺序：

```ts
const result = await repository.update(input);
await invalidator.invalidateContent({ id: input.id, type: "post" });
return result;
```

`destroyPosts` 和 `destroyPages` 在 Repository 成功后使用 `Promise.all(ids.map(...))`；`create*` 使用 Repository 返回的 `result.id`；`updatePostTags` 使用 `input.postId`。

- [ ] **Step 4: 运行用例测试并确认 GREEN**

Run: `bunx vitest run src/features/post/application src/features/page/application`

Expected: PASS。

- [ ] **Step 5: 更新 Router 为纯依赖组装**

Router 仅导入 `publicContentInvalidator` 并把它传给对应命令：

```ts
return createPost(
  createPostCommandRepository(ctx.db),
  input,
  ctx.user.id,
  publicContentInvalidator,
);
```

删除 Router 内部 `const result`、直接 `.invalidateContent()` 和 `Promise.all` 编排；保留 `.catch(mapApplicationError)` 的现有位置和语义。

- [ ] **Step 6: 更新 Router 测试并运行**

Router 测试 mock `publicContentInvalidator` 对象，验证返回值和错误映射；副作用顺序只在 Application 测试断言。

Run: `bunx vitest run src/features/post/tests/post.router.test.ts src/features/page/tests/page.router.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交内容 Feature 迁移**

```bash
git add src/features/post src/features/page
git commit -m "refactor(content): move cache effects into use cases"
```

### Task 3: 迁移 Comment 的验证、通知与缓存组合

**Files:**
- Modify: `src/features/comment/application/comment-commands.ts`
- Modify: `src/features/comment/comment-command-handlers.test.ts`
- Modify: `src/features/comment/comment.router.ts`
- Modify: `src/features/comment/tests/comment.router.test.ts`

**Interfaces:**
- Produces: `CreateCommentDependencies`，包含 Repository、验证码、通知、失败日志和缓存端口
- Consumes: `Pick<PublicContentInvalidator, "invalidateContent" | "invalidateAll">`
- Preserves: 验证码 → 数据库 → 尽力通知 → 目标缓存失效顺序

- [ ] **Step 1: 写评论组合失败测试**

```ts
it("按验证、写入、通知和缓存顺序创建评论", async () => {
  const order: string[] = [];
  const dependencies: CreateCommentDependencies = {
    repository: { create: vi.fn(async () => { order.push("repository"); return CREATED; }) },
    validateCaptcha: vi.fn(async () => { order.push("captcha"); }),
    notify: vi.fn(async () => { order.push("notify"); }),
    logNotificationFailure: vi.fn(),
    invalidator: { invalidateContent: vi.fn(async () => { order.push("cache"); }) },
  };

  await createComment(dependencies, new Headers(), { ...INPUT, postId: POST_ID });
  expect(order).toEqual(["captcha", "repository", "notify", "cache"]);
});
```

另写三个测试：验证码或数据库失败时不通知且不失效；通知失败被记录后仍失效并返回成功；页面评论失效 `page`，无 post/page 的 custom 评论不调用定向缓存。

- [ ] **Step 2: 运行测试并确认 RED**

Run: `bunx vitest run src/features/comment/comment-command-handlers.test.ts`

Expected: FAIL，因为缓存仍在 Router 且 `CreateCommentDependencies` 不存在。

- [ ] **Step 3: 实现评论依赖对象和缓存顺序**

```ts
export interface CreateCommentDependencies {
  repository: Pick<CommentCommandRepository, "create">;
  validateCaptcha(token?: string): Promise<void>;
  notify(commentId: string, parentId?: string | null): Promise<void>;
  logNotificationFailure(error: unknown): void;
  invalidator: Pick<PublicContentInvalidator, "invalidateContent">;
}
```

`createComment` 解构该对象；通知仍用 `try/catch`，之后根据 `postId` 或 `pageId` 调用缓存。`updateComment` 和 `destroyComments` 接收 `invalidateAll` 端口，在 Repository 成功后调用。

- [ ] **Step 4: 运行 Application 测试并确认 GREEN**

Run: `bunx vitest run src/features/comment/comment-command-handlers.test.ts src/features/comment/domain/comment.test.ts`

Expected: PASS。

- [ ] **Step 5: 简化 Comment Router 并运行回归**

Router 组装 `CreateCommentDependencies`，删除任何直接缓存方法调用；限流 procedure 保持不变。

Run: `bunx vitest run src/features/comment/tests/comment.router.test.ts src/features/comment/comment-command-handlers.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交评论迁移**

```bash
git add src/features/comment
git commit -m "refactor(comment): own side effects in application"
```

### Task 4: 迁移全量公开缓存 Feature

**Files:**
- Modify: `src/features/category/application/category-use-cases.ts`
- Modify: `src/features/category/application/category-use-cases.test.ts`
- Modify: `src/features/category/category.router.ts`
- Modify: `src/features/category/tests/category.router.test.ts`
- Modify: `src/features/tag/application/tag-use-cases.ts`
- Create: `src/features/tag/application/tag-use-cases.test.ts`
- Modify: `src/features/tag/tag.router.ts`
- Modify: `src/features/tag/tests/tag.router.test.ts`
- Modify: `src/features/menu/application/menu-use-cases.ts`
- Modify: `src/features/menu/application/menu-use-cases.test.ts`
- Modify: `src/features/menu/menu.router.ts`
- Modify: `src/features/menu/tests/menu.router.test.ts`
- Modify: `src/features/setting/application/setting-use-cases.ts`
- Create: `src/features/setting/application/setting-use-cases.test.ts`
- Modify: `src/features/setting/setting.router.ts`
- Modify: `src/features/setting/tests/setting.router.test.ts`
- Modify: `src/features/user/application/user-commands.ts`
- Modify: `src/features/user/user-command-handlers.test.ts`
- Modify: `src/features/user/user.router.ts`
- Modify: `src/features/user/tests/user.router.test.ts`

**Interfaces:**
- Consumes: `Pick<PublicContentInvalidator, "invalidateAll">`
- Produces: 所有影响公开目录的写入在 Repository 成功后完成全量公开缓存失效

- [ ] **Step 1: 为每个 Feature 写一个共享行为测试组并确认 RED**

每个 create/update/destroy 或 save 命令至少验证成功调用一次 `invalidateAll`；每个 Feature 至少验证一个 Repository 失败不调用缓存。通用断言形态：

```ts
const order: string[] = [];
const invalidator = { invalidateAll: vi.fn(async () => { order.push("cache"); }) };
const repository = { update: vi.fn(async () => { order.push("repository"); return RESULT; }) };

await updateSetting(repository, INPUT, invalidator);
expect(order).toEqual(["repository", "cache"]);
```

Run: `bunx vitest run src/features/category/application src/features/tag/application src/features/menu/application src/features/setting/application src/features/user/application`

Expected: FAIL，因为这些写入尚未接受缓存端口。

- [ ] **Step 2: 逐 Feature 实现成功后失效**

把返回 Promise 的薄命令改为 `async`，先保存 `result`、再 `await invalidator.invalidateAll()`、最后返回原结果。Category 必须在全部业务校验和 Repository 成功后失效；User 必须保留受保护用户、状态聚合和权限逻辑。

- [ ] **Step 3: 运行 Application 测试并确认 GREEN**

Run: `bunx vitest run src/features/category/application src/features/tag/application src/features/menu/application src/features/setting/application src/features/user/application`

Expected: PASS。

- [ ] **Step 4: 更新五个 Router 和 Router 测试**

Router 把同一个 `publicContentInvalidator` adapter 传给 Use Case，删除直接调用。保留 Category/Menu/User 的 `mapApplicationError`，不得把错误映射迁入 Application。

Run: `bunx vitest run src/features/category/tests/category.router.test.ts src/features/tag/tests/tag.router.test.ts src/features/menu/tests/menu.router.test.ts src/features/setting/tests/setting.router.test.ts src/features/user/tests/user.router.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交目录 Feature 迁移**

```bash
git add src/features/category src/features/tag src/features/menu src/features/setting src/features/user
git commit -m "refactor(features): centralize cache side effects"
```

### Task 5: 收紧静态边界并审计其他外部服务

**Files:**
- Modify: `tests/public-cache-invalidation-boundaries.test.ts`
- Modify: `tests/feature-boundaries.test.ts`
- Modify: `tests/architecture-complexity.test.ts`
- Modify: `openspec/changes/move-side-effects-to-application/tasks.md`

**Interfaces:**
- Consumes: Router 文件、Application 文件和 TypeScript import/call 结构
- Produces: 禁止 transport 直接调用业务副作用、禁止 Application 依赖 Infrastructure 的持续门禁

- [ ] **Step 1: 将旧 Router 正向断言改为职责边界断言**

```ts
it("Router 只注入公开缓存端口且不直接编排失效", () => {
  for (const path of publicVisibleRouters) {
    const source = readFileSync(path, "utf8");
    expect(source).not.toMatch(/invalidatePublicContent|invalidateAllPublicContent/);
    expect(source).not.toMatch(/await\s+publicContentInvalidator\.(?:invalidateContent|invalidateAll)/);
    expect(source).toContain("publicContentInvalidator");
  }
});
```

增加 Application 生产文件不得导入 `@/packages/infrastructure`、`next/cache`、S3 或 Resend SDK 的断言。评论和媒体 Router 可以导入 adapter 用于注入，但不得直接调用 `sendCommentEmail`、`deleteObjects`、`validateCaptcha` 或缓存方法。

- [ ] **Step 2: 在实现前运行静态测试并确认正确失败**

Run: `bunx vitest run tests/public-cache-invalidation-boundaries.test.ts tests/feature-boundaries.test.ts tests/architecture-complexity.test.ts`

Expected: 在迁移尚未完成的中间提交上 FAIL；若前序任务已全部完成，则用 `git show HEAD~1:<router>` fixture 或内联违规源码验证门禁会拒绝直接调用，而不是接受一个永远通过的正则。

- [ ] **Step 3: 完成静态门禁并复扫所有副作用调用**

Run:

```bash
rg -n "invalidatePublicContent|invalidateAllPublicContent|sendCommentEmail|deleteObjects|validateCaptcha" src/features src/app src/packages
```

Expected: 缓存函数旧名无生产消费者；邮件发送、对象删除、验证码调用的顺序只在 Application 或 Infrastructure adapter 中出现；Router 只出现依赖注入所需的 adapter 标识。

- [ ] **Step 4: 运行架构与类型治理测试**

Run: `bunx vitest run tests/public-cache-invalidation-boundaries.test.ts tests/feature-boundaries.test.ts tests/architecture-complexity.test.ts tests/type-safety-governance.test.ts tests/server-only-boundaries.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交治理门禁**

```bash
git add tests/public-cache-invalidation-boundaries.test.ts tests/feature-boundaries.test.ts tests/architecture-complexity.test.ts
git commit -m "test(architecture): enforce application side effects"
```

### Task 6: 同步文档与 OpenSpec

**Files:**
- Modify: `README.md`
- Modify: `src/features/README.md`
- Modify: `docs/architecture-dependency-report.md`
- Modify: `.codex/skills/frontend-structure/references/architecture.md`
- Modify: `.codex/skills/frontend-structure/references/quality.md`
- Modify: `.codex/skills/lightweight-ddd/SKILL.md`
- Modify: `openspec/changes/move-side-effects-to-application/tasks.md`
- Create: `openspec/changes/move-side-effects-to-application/verification.md`

**Interfaces:**
- Produces: 与实现一致的长期架构规则、验证记录和完成任务状态

- [ ] **Step 1: 更新长期文档**

明确：Router 可以导入并组装 adapter，但任何与业务写入结果相关的缓存、通知、验证码和存储顺序必须由 Use Case 表达；API 限流、会话、入口鉴权和协议映射仍在 transport。删除“Router 在写入后直接失效缓存”的旧描述。

- [ ] **Step 2: 更新 OpenSpec 任务状态并创建验证记录**

每完成一个 OpenSpec task 立即把 `- [ ]` 改为 `- [x]`。`verification.md` 记录 RED 证据、聚焦测试、完整质量命令、构建结果和任何环境限制，不把未执行项写成通过。

- [ ] **Step 3: 验证文档和 OpenSpec**

Run: `openspec validate move-side-effects-to-application --strict && bunx vitest run tests/documentation-consistency.test.ts tests/single-source-contracts.test.ts`

Expected: PASS。

- [ ] **Step 4: 提交文档**

```bash
git add README.md src/features/README.md docs/architecture-dependency-report.md .codex/skills/frontend-structure .codex/skills/lightweight-ddd openspec/changes/move-side-effects-to-application
git commit -m "docs(architecture): align side effect ownership"
```

### Task 7: 完整质量验证

**Files:**
- Modify only if verification reveals a regression in files already within this plan's scope.

**Interfaces:**
- Produces: 可审计的最终验证证据

- [ ] **Step 1: 运行静态质量门禁**

Run: `bun run check-types && bun run lint && bun run db:migrations:check && git diff --check`

Expected: exit 0。

- [ ] **Step 2: 运行完整测试与覆盖率**

Run: `bun run test:unit:run && bun run test:unit:coverage && bun run test:unit:process`

Expected: 全部测试通过；全局 statements/lines ≥ 70%、functions ≥ 65%、branches ≥ 60%，关键文件 statements/lines ≥ 90%、branches ≥ 80%。

- [ ] **Step 3: 运行生产依赖审计**

Run: `bun run audit:production`

Expected: 0 个未豁免阻断发现；若网络被沙箱限制，使用审批后的同一命令重试并记录事实。

- [ ] **Step 4: 运行生产构建**

Run:

```bash
NEXT_PUBLIC_SITE_URL=https://example.test TURSO_URL=http://127.0.0.1:1 TURSO_TOKEN=unreachable-test-token AUTH_SECRET=build-only-test-secret-32-characters AUTH_URL=https://example.test bun run build
```

若当前沙箱再次阻止 Turbopack PostCSS 子进程绑定内部端口，再运行同环境的 `bun next build --webpack`，分别记录默认构建失败和 Webpack 构建结果。

- [ ] **Step 5: 检查最终差异和任务覆盖**

Run: `git status --short && git diff --check && openspec status --change move-side-effects-to-application`

逐条对照三份 delta spec 和 OpenSpec tasks，不得仅凭测试通过宣告完成。

- [ ] **Step 6: 提交最终验证记录**

```bash
git add openspec/changes/move-side-effects-to-application/verification.md openspec/changes/move-side-effects-to-application/tasks.md
git commit -m "docs(openspec): record side effect verification"
```
