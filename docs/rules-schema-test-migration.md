# 纯规则与 schema 测试迁移记录

## 范围与基线

本地基线 8ffb0cc6408e3f94647a826df4c513db91818a29 与远端 10dcd9868dfb1f7476809709f22258c84b91762b 共享 tree 28a8a9aea599b23799d66e48352c22715dbf2167。仅整理 feature 根 rules.ts、rules.test.ts、schema.test.ts，以及只测试 isUserEnabled 的 user/user.test.ts。既有 comment/schemas 测试、user/login/login.schema.test.ts、lib/db/schema 和生产 schema 均不变。

## 实现与符号映射

| 原文件           | 目标文件与符号                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| comment/rules.ts | rules/comment-moderation.ts：assertCommentTransition，私有 transitions 原样                                   |
| page/rules.ts    | rules/page-publication.ts：getPagePublishStatus、getPageWithdrawStatus；validateCurrentStatus 保持私有        |
| post/rules.ts    | rules/post-publication.ts：getPostPublishStatus、getPostWithdrawStatus；validateCurrentStatus 保持私有        |
| user/rules.ts    | rules/user-protection.ts：isProtectedUser、assertUserDeletable、assertUserLevelChange、assertUserStatusChange |
| user/rules.ts    | rules/user-status.ts：isUserEnabled                                                                           |

12 个函数声明、10 个公开函数和审核状态表不变。不新增类型、枚举、公开 helper、barrel 或空目录。发布与撤回属于同一状态生命周期，保护不变量保持整体；仅用户启用状态另有单一职责。

## 测试文件与展开用例

| 目标文件                                              | 展开用例 |
| ----------------------------------------------------- | -------- |
| tests/integration/content-command-enums.test.ts       | 1        |
| src/features/comment/rules/comment-moderation.test.ts | 19       |
| src/features/page/rules/page-publication.test.ts      | 8        |
| src/features/page/schemas/page.insert.schema.test.ts  | 3        |
| src/features/page/schemas/page.update.schema.test.ts  | 1        |
| src/features/post/rules/post-publication.test.ts      | 8        |
| src/features/post/schemas/post.delete.schema.test.ts  | 2        |
| src/features/post/schemas/post.insert.schema.test.ts  | 5        |
| src/features/post/schemas/post.update.schema.test.ts  | 13       |
| src/features/user/rules/user-protection.test.ts       | 7        |
| src/features/user/rules/user-status.test.ts           | 1        |
| src/features/user/schemas/user.write.schema.test.ts   | 8        |

原 8 个文件迁为 12 个，38 个测试声明、76 个展开用例、66 处静态 expect、0 钩子、0 mock、0 数据库初始化均保持。每个测试体和 it.each 参数表的规范化 AST 与基线逐项相同，展开测试完整名称的多重集合相同。规则外层状态组合循环、轻量输入字面量也必须保持，不靠总数代替逐体比对。

post/page 合法基线对照保留一个测试、两条断言，位于 tests/integration/content-command-enums.test.ts；无效 enum 行跟随实际 schema。user.write.schema.ts 本来统一拥有 insert/update，相关测试整体迁移，不硬拆共享边界或创建/更新对照。只复制必要轻量对象，不引入共享 fixture 框架，不增加昂贵初始化。

### 每个原始测试声明的目标

路径均相对仓库根；参数矩阵仍在原测试声明中展开。

| 原文件 | 测试完整名称 | 目标文件 |
| --- | --- |
| src/features/comment/rules.test.ts | comment moderation rules > `${from} → ${to} preserves the moderation policy` | src/features/comment/rules/comment-moderation.test.ts |
| src/features/comment/rules.test.ts | comment moderation rules > rejects blank identity %j before transition validation | src/features/comment/rules/comment-moderation.test.ts |
| src/features/page/rules.test.ts | page publication rules > publishes %s | src/features/page/rules/page-publication.test.ts |
| src/features/page/rules.test.ts | page publication rules > withdraws a published page | src/features/page/rules/page-publication.test.ts |
| src/features/page/rules.test.ts | page publication rules > rejects an invalid transition | src/features/page/rules/page-publication.test.ts |
| src/features/page/rules.test.ts | page publication rules > validates status before id and id before transitions | src/features/page/rules/page-publication.test.ts |
| src/features/post/rules.test.ts | post publication rules > publishes %s | src/features/post/rules/post-publication.test.ts |
| src/features/post/rules.test.ts | post publication rules > withdraws a published post | src/features/post/rules/post-publication.test.ts |
| src/features/post/rules.test.ts | post publication rules > rejects an invalid transition | src/features/post/rules/post-publication.test.ts |
| src/features/post/rules.test.ts | post publication rules > validates status before id and id before transitions | src/features/post/rules/post-publication.test.ts |
| src/features/user/user.test.ts | isUserEnabled > keeps the enabled-status rule in one domain predicate | src/features/user/rules/user-status.test.ts |
| src/features/user/rules.test.ts | protected account rules > allows ordinary account deletion, level changes, and status changes | src/features/user/rules/user-protection.test.ts |
| src/features/user/rules.test.ts | protected account rules > rejects deleting or demoting an administrator | src/features/user/rules/user-protection.test.ts |
| src/features/user/rules.test.ts | protected account rules > only administrators can change an administrator's status | src/features/user/rules/user-protection.test.ts |
| src/features/user/rules.test.ts | protected account rules > preserves identity validation for %j | src/features/user/rules/user-protection.test.ts |
| src/features/user/rules.test.ts | validates nonblank identity without requiring an aggregate or normalizing it | src/features/user/rules/user-protection.test.ts |
| src/features/page/schema.test.ts | page editor revision input > requires creation token without relaxing bilingual fields | src/features/page/schemas/page.insert.schema.test.ts |
| src/features/post/schema.test.ts | content command enum schemas > rejects only the invalid page %s | src/features/page/schemas/page.insert.schema.test.ts |
| src/features/page/schema.test.ts | page editor revision input > requires a version and actual editable field | src/features/page/schemas/page.update.schema.test.ts |
| src/features/post/schema.test.ts | strict post delete input > rejects unsupported fields: %j | src/features/post/schemas/post.delete.schema.test.ts |
| src/features/post/schema.test.ts | content command enum schemas > rejects only the invalid post %s | src/features/post/schemas/post.insert.schema.test.ts |
| src/features/post/schema.test.ts | atomic post input > requires a durable creation token | src/features/post/schemas/post.insert.schema.test.ts |
| src/features/post/schema.test.ts | explicit post translation patch > rejects server-owned create fields rather than stripping them | src/features/post/schemas/post.insert.schema.test.ts |
| src/features/post/schema.test.ts | atomic post input > requires an explicit editor baseline | src/features/post/schemas/post.update.schema.test.ts |
| src/features/post/schema.test.ts | atomic post input > does not count the expected version as an edit | src/features/post/schemas/post.update.schema.test.ts |
| src/features/post/schema.test.ts | atomic post input > retains explicit relation clears | src/features/post/schemas/post.update.schema.test.ts |
| src/features/post/schema.test.ts | explicit post translation patch > accepts explicit locale removal without requiring translated values | src/features/post/schemas/post.update.schema.test.ts |
| src/features/post/schema.test.ts | explicit post translation patch > rejects simultaneous modification and removal: %j | src/features/post/schemas/post.update.schema.test.ts |
| src/features/post/schema.test.ts | explicit post translation patch > allows editing another locale while removing one | src/features/post/schemas/post.update.schema.test.ts |
| src/features/post/schema.test.ts | explicit post translation patch > rejects unsupported or server-owned update input: %j | src/features/post/schemas/post.update.schema.test.ts |
| src/features/user/schema.test.ts | admin user write schemas > isolates invalid update fields from valid identifier validation | src/features/user/schemas/user.write.schema.test.ts |
| src/features/user/schema.test.ts | admin user write schemas > accepts valid update values with the same identifier and password boundaries | src/features/user/schemas/user.write.schema.test.ts |
| src/features/user/schema.test.ts | admin user write schemas > accepts passwords at the shared boundaries | src/features/user/schemas/user.write.schema.test.ts |
| src/features/user/schema.test.ts | admin user write schemas > rejects malformed email addresses | src/features/user/schemas/user.write.schema.test.ts |
| src/features/user/schema.test.ts | admin user write schemas > rejects passwords outside the shared boundaries | src/features/user/schemas/user.write.schema.test.ts |
| src/features/user/schema.test.ts | normalizes new emails but preserves update spelling for transactional comparison | src/features/user/schemas/user.write.schema.test.ts |
| src/features/user/schema.test.ts | does not broaden existing email validation for %s | src/features/user/schemas/user.write.schema.test.ts |
| src/features/post/schema.test.ts | content command enum schemas > accepts the otherwise-valid post and page baselines | tests/integration/content-command-enums.test.ts |

## 消费者与门禁

9 个生产消费者仅改导入入口；auth-hooks 的 vi.mock 与 importOriginal 同步到 user-status，跨 feature-rules 集成场景保持完整。规则目录继续受纯模块、UI 隔离和类型安全检查，静态授权白名单仅精确允许 user-protection，不放行整个 rules/。旧根 rules.ts/rules.test.ts/schema.test.ts 禁止回归；rules/ 禁止 index 和兼容转导出。types/schemas 的权威契约分类保持原有含义，rules 不被误当 DTO。覆盖率保护模式同步到 rules/**/*.ts，不调整覆盖范围、阈值、worker、隔离或 CI 编排。

## 验证口径

生产等价检查对 4 个旧 rules 与 5 个新 rules 的全部非 import 声明做多重集合比对，包含导出修饰符、私有 helper 与状态表；其余 539 个生产文件逐文件比较非 import AST，仅规范化必要的延迟导入路径。测试迁移前后均运行目标 76 用例并逐项核对完整名称、测试体、参数、断言、钩子及 fixture。另执行类型、Lint、架构、完整非 E2E 覆盖率、进程门禁、生产构建和严格规格检查。测试数据库只使用本轮独占临时本地文件并核验清理。

浏览器 E2E 不纳入非 E2E 通过结论；当前 Playwright 浏览器可执行文件缺失，既有下载限制不绕过。可发现性清单不等于执行通过。发布另待明确授权，不创建 PR、合并或部署。

## 本轮本地验证结果

- 类型检查、Lint 和 git diff --check 通过；21 个架构文件 / 260 用例通过。
- 完整非 E2E：覆盖率通道 447 文件 / 3125 用例，进程通道 6 文件 / 102 用例，合计 453 文件 / 3227 用例；用例总数与基线一致，文件数仅因本轮拆分增加 4。
- 覆盖率分子/分母完全相同：statements 6429/6895（93.24%）、branches 4164/4708（88.44%）、functions 1886/2027（93.04%）、lines 6005/6362（94.38%）。
- 覆盖率/进程通道单次墙钟 120s/31s，对照上一轮 119s/33s；未调整 fixture、worker 或覆盖率配置，不将单次波动当作稳定性能结论。
- 生产构建和严格规格检查通过，69 项规格全部通过；本轮独占临时 SQLite 及目录已核验删除。
- 开发 66 项、生产 1 项 E2E 仅完成清单检查；Chromium、Firefox、WebKit 均无可执行文件，真实浏览器回归未运行。
- 独立静态复核确认所有测试体、参数矩阵、外层循环、fixture 与生产规则 AST 等价；64 个既有 types 文件及 41 个既有 schemas 文件逐字节未变。
