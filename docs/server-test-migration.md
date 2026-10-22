# 服务端测试职责迁移

基线为本地 47d7e55b，与已推送 cc065091 的 tree 相同。本轮只调整测试位置和组织，生产实现、用例名称、断言、测试环境和昂贵 fixture 不变。

## 文件与基线

8 个根 server.test.ts 与 3 个根 server.integration.test.ts 共 1996 行；仅 menu/page 真正混合职责，其余 9 个文件整体迁移。13 个目标文件不与现有测试冲突。

| 原文件（src/features/ 下）           | 目标文件（src/features/ 下）                                                       | 声明 / 展开用例 | 静态 expect / 钩子 |
| ------------------------------------ | ---------------------------------------------------------------------------------- | --------------- | ------------------ |
| category/server.integration.test.ts  | category/server/category-commands.integration.test.ts                              | 4 / 5           | 34 / 2             |
| category/server.test.ts              | category/server/category-commands.test.ts                                          | 6 / 6           | 16 / 0             |
| dashboard/server.integration.test.ts | dashboard/server/dashboard-queries.integration.test.ts                             | 1 / 1           | 6 / 1              |
| dashboard/server.test.ts             | dashboard/server/dashboard-queries.test.ts                                         | 2 / 2           | 5 / 0              |
| link/server.test.ts                  | link/server/link-operations.test.ts                                                | 4 / 4           | 10 / 0             |
| media/server.test.ts                 | media/server/media-delete.test.ts                                                  | 10 / 11         | 30 / 0             |
| menu/server.test.ts                  | menu/server/menu-commands.test.ts<br>menu/server/menu-queries.test.ts              | 6 / 10          | 24 / 0             |
| page/server.test.ts                  | page/server/page-commands.integration.test.ts<br>page/server/page-commands.test.ts | 23 / 27         | 61 / 2             |
| setting/server.test.ts               | setting/server/setting-update.test.ts                                              | 4 / 4           | 15 / 0             |
| tag/server.integration.test.ts       | tag/server/tag-commands.integration.test.ts                                        | 2 / 3           | 16 / 2             |
| tag/server.test.ts                   | tag/server/tag-commands.test.ts                                                    | 3 / 3           | 9 / 0              |

“声明”按 it/it.each 注册点统计；展开用例由真实运行报告统计。静态 expect 指 expect(...) 调用位置，包含钩子，不计 expect.any/objectContaining 等匹配辅助函数，也不等同于运行时断言次数。基线合计 65 个声明、76 个展开用例、226 处 expect（测试体 216、钩子 10）、7 个钩子。

## 必须保留的场景与成本

- menu 命令保留完整整树校验和事务重试；查询独立保留 80 页、160 条翻译及线性访问上界。
- page 的 SQLite 命令事务、并发、回滚、幂等恢复和写后查询观察器保留在一个 integration 文件；仅拆出原本无数据库的两个重试测试。
- category/tag 的 COMMIT 观察、提交前结果组装及失败回滚保持完整；category 两个 1101 条批量删除场景不缩减。
- media-delete 保留 17 对象的 [8,8,1] 分块和 9 对象失败后的在途请求等待，不并入已有真实数据库测试。
- 真实库初始化仍为 category 5＋dashboard 1＋page 25＋tag 3＝34 次。7 个生命周期钩子及 node/jsdom 分配不变，没有新增数据库 fixture 或共享测试框架。
- Vitest 通配清单已覆盖新路径，进程组、覆盖率排除、worker 和 CI 编排不变。旧审计台账及历史计划保留当时路径，以下映射用于定位现有测试。

## 逐用例清单

以下是迁移前真实执行的 76 个展开用例；迁移后按名称及参数逐一核对，恰好出现一次。

### category/server.integration.test.ts

- Category update transaction result boundary deletes a large selection atomically with bounded SQL and one menu revision → [category-commands.integration.test.ts](../src/features/category/server/category-commands.integration.test.ts)
- Category update transaction result boundary rolls back earlier delete chunks and menu revision when a later category has a post → [category-commands.integration.test.ts](../src/features/category/server/category-commands.integration.test.ts)
- Category update transaction result boundary returns the committed multilingual result with completed sync without a post-commit read → [category-commands.integration.test.ts](../src/features/category/server/category-commands.integration.test.ts)
- Category update transaction result boundary returns the committed multilingual result with degraded sync without a post-commit read → [category-commands.integration.test.ts](../src/features/category/server/category-commands.integration.test.ts)
- Category update transaction result boundary rolls back translated changes when assembling the result fails before commit → [category-commands.integration.test.ts](../src/features/category/server/category-commands.integration.test.ts)

### category/server.test.ts

- Category server operations 拒绝分类将自己设置为父节点 → [category-commands.test.ts](../src/features/category/server/category-commands.test.ts)
- Category server operations 拒绝分类形成父子循环 → [category-commands.test.ts](../src/features/category/server/category-commands.test.ts)
- Category server operations 拒绝分类使用已存在的路径 → [category-commands.test.ts](../src/features/category/server/category-commands.test.ts)
- Category server operations 通过校验后更新分类 → [category-commands.test.ts](../src/features/category/server/category-commands.test.ts)
- Category server operations 创建和删除分类也会失效菜单派生的 sitemap → [category-commands.test.ts](../src/features/category/server/category-commands.test.ts)
- Category server operations 写入失败时不刷新缓存 → [category-commands.test.ts](../src/features/category/server/category-commands.test.ts)

### dashboard/server.integration.test.ts

- aggregates actual SQLite rows in five queries with enum ordering and missing counts → [dashboard-queries.integration.test.ts](../src/features/dashboard/server/dashboard-queries.integration.test.ts)

### dashboard/server.test.ts

- dashboard statistics preserves counts, enum order, author fallback, DTO fields and operation names → [dashboard-queries.test.ts](../src/features/dashboard/server/dashboard-queries.test.ts)
- dashboard statistics preserves zero counts when count queries return no rows → [dashboard-queries.test.ts](../src/features/dashboard/server/dashboard-queries.test.ts)

### link/server.test.ts

- Link server operations 每个成功写操作都会失效全部公开内容 → [link-operations.test.ts](../src/features/link/server/link-operations.test.ts)
- Link server operations 先持久化友情链接，再失效缓存 → [link-operations.test.ts](../src/features/link/server/link-operations.test.ts)
- Link server operations 数据库写入失败时不失效缓存 → [link-operations.test.ts](../src/features/link/server/link-operations.test.ts)
- Link server operations 持久化成功后的缓存降级仍返回删除结果 → [link-operations.test.ts](../src/features/link/server/link-operations.test.ts)

### media/server.test.ts

- deletes storage and confirms absence inside the repository transaction → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- reports partial or unknown deletion without promising rollback → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- requires risk acknowledgment before touching storage or persistence → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- idempotently bulk deletes an already absent object → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- keeps committed deletion successful when public cache refresh fails → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- bulk deletes unique keys after reference checks and verifies before row deletion → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- does not contact storage for an empty repository batch → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- verifies a large batch in full chunks of at most eight HEADs → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- settles every started HEAD before reporting unknown verification failure → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- settles every started HEAD before reporting present verification failure → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)
- passes an empty historical key to storage and retains rows when storage rejects it → [media-delete.test.ts](../src/features/media/server/media-delete.test.ts)

### menu/server.test.ts

- Menu server operations 拒绝空菜单 → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- Menu server operations 拒绝重复菜单 ID → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- Menu server operations 拒绝父节点不存在 → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- Menu server operations 拒绝菜单树循环 → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- Menu server operations 拒绝菜单自引用 → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- Menu server operations 通过校验后保存菜单树 → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- Menu server operations 事务失败时不刷新缓存 → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- BEGIN-only transaction retries keeps four attempts, 10/20/40ms delays and the existing conflict message → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- BEGIN-only transaction retries does not replay SQLITE_BUSY after entering the callback → [menu-commands.test.ts](../src/features/menu/server/menu-commands.test.ts)
- groups each translation once while preserving title and branch semantics → [menu-queries.test.ts](../src/features/menu/server/menu-queries.test.ts)

### page/server.test.ts

- atomic versioned page writes returns minimal committed result with completed invalidation → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes returns minimal committed result with degraded invalidation → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes preserves the persisted creation hash golden bytes → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes sanitizes page content once per create or update and skips replay → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rolls back body and version when bilingual translation fails → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rolls back parent when creating translations fails → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes allows one of two same-version writers only → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes deduplicates concurrent creation and retains original hash after edits → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes scopes tokens and recovery to current actor and has no deleted receipt → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rechecks DISABLE actor before all commands and recovery → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rechecks DELETED actor before all commands and recovery → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rejects a guest or missing actor even on direct command entry → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rejects unsupported direct fields without touching storage → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rolls back an entire delete batch on a stale item → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes preserves DRAFT to PUBLISHED transition → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes preserves TO_AUDIT to PUBLISHED transition → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes preserves PUBLISHED to DRAFT transition → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rejects invalid status transitions and missing targets → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes preserves omitted fields and rejects empty required bilingual values → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes rejects unknown managed media in the same page save transaction → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes accepts ordinary managed media in the page save transaction → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes updates both bilingual fields atomically and accepts unchanged status → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes refuses withdrawing an unpublished page and does not increment draft views → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes validates versioned delete input before writes → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- atomic versioned page writes does not leak private creation fields and views do not advance editor version → [page-commands.integration.test.ts](../src/features/page/server/page-commands.integration.test.ts)
- page transaction retries bounds retries to contention before the business callback starts → [page-commands.test.ts](../src/features/page/server/page-commands.test.ts)
- page transaction retries does not retry a callback or unknown commit failure → [page-commands.test.ts](../src/features/page/server/page-commands.test.ts)

### setting/server.test.ts

- Setting server operations 更新已提交后缓存降级仍返回持久化结果 → [setting-update.test.ts](../src/features/setting/server/setting-update.test.ts)
- Setting server operations 写入失败时不刷新缓存 → [setting-update.test.ts](../src/features/setting/server/setting-update.test.ts)
- BEGIN-only transaction retries keeps four attempts, 10/20/40ms delays and the existing conflict message → [setting-update.test.ts](../src/features/setting/server/setting-update.test.ts)
- BEGIN-only transaction retries does not replay SQLITE_BUSY after entering the callback → [setting-update.test.ts](../src/features/setting/server/setting-update.test.ts)

### tag/server.integration.test.ts

- Tag update transaction result boundary returns the committed multilingual result with completed sync without a post-commit read → [tag-commands.integration.test.ts](../src/features/tag/server/tag-commands.integration.test.ts)
- Tag update transaction result boundary returns the committed multilingual result with degraded sync without a post-commit read → [tag-commands.integration.test.ts](../src/features/tag/server/tag-commands.integration.test.ts)
- Tag update transaction result boundary rolls back translated changes when assembling the result fails before commit → [tag-commands.integration.test.ts](../src/features/tag/server/tag-commands.integration.test.ts)

### tag/server.test.ts

- Tag server operations 在写入成功后刷新公开内容 → [tag-commands.test.ts](../src/features/tag/server/tag-commands.test.ts)
- Tag server operations 写入失败时不刷新缓存 → [tag-commands.test.ts](../src/features/tag/server/tag-commands.test.ts)
- Tag server operations tag destroy 使用批量删除并返回成功 → [tag-commands.test.ts](../src/features/tag/server/tag-commands.test.ts)

## 验证

相关测试迁前和迁后均 76/76 通过，墙钟均约 4 秒。65 个测试声明及 7 个钩子的 AST 精确等价，静态 expect 仍为 226；模块 mock 和有效测试环境不变。完整非 E2E 为 449 文件 / 3227 测试，较基线仅增加 2 个职责文件，用例数不变；类型、Lint、21 文件 / 260 项架构检查、6 文件 / 102 项进程门禁、生产构建及 69 项严格规格检查全部通过。覆盖率与基线相同：statements 93.24%、branches 88.44%、functions 93.04%、lines 94.38%。本轮独占临时 SQLite 已验证清理。

本地单次耗时对比：聚焦 76 项从 3.830s 到 3.630s；完整覆盖率从 117s 到 119s，进程门禁从 27s 到 33s，构建从 24s 到 13s。观察值包含缓存和调度波动，不据此宣称稳定 CI 提速；昂贵 fixture、worker、分片和进程组保持不变。

E2E 仅确认开发 66 项、生产 1 项可发现；当前 Playwright 浏览器可执行文件仍缺失，未运行真实浏览器测试，也未绕过既有下载阻塞。
