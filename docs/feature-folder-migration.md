# Feature 职责目录迁移验收

本轮仅整理模块内契约与服务端实现位置，不改变枚举值、schema/default/transform、服务端事务、权限或产品行为。

## 最小统一约定

- 11 个现有模块按实际职责组织，删除 28 个旧根入口（10 个 types.ts、10 个 schema.ts、8 个 server.ts），不保留兼容 barrel。
- types/<feature>.<职责>.ts：DTO 及静态类型使用显式 import type；以 schema 为权威的契约继续通过 z.input/z.output 推导。
- 18 个现有 enum 原样迁入各自 feature/types/，一枚举一文件。中立业务枚举可供 schema、DB、server 和 UI 使用；*-name 与 post-info.align 为展示枚举，禁止反向进入业务 schema、DB 或 server。
- schemas/<feature>.<职责>.schema.ts：只导出运行时 schema，不导出静态 DTO。schema 可依赖中立枚举/字面量 catalog，不反向依赖本模块或其他模块的派生 DTO。
- server/：按真实命令、查询、上传、删除、快照或翻译组装职责组织，沿用现有 kebab-case 文件名。执行数据库/存储/认证或服务端编排的入口保留 server-only；仅类型化的纯转换 helper 不因为目录位置而强加运行时 marker。
- 没有对应职责不创建空目录，不新增纯转发 index.ts，不顺带清理原有无消费者导出。

## 未继续碎拆的职责

- dashboard 只有查询实现，迁入 server/dashboard-queries.ts，不虚构 types/ 或 schemas/。
- link 的小型 CRUD 实现仍合为 server/link-operations.ts；page 的版本化写命令合为 server/page-commands.ts，避免复制公共事务逻辑。
- user/schemas/user.write.schema.ts 保留 insert/update 及共享 email 约束，login/login.schema.ts 继续保持独立的登录表单语义。
- post/page 的字段与 version 校验作为具名 fields schema；既有 server 命令/查询/纯转换文件不为了统一目录而重复拆分。
- comment 的公开业务输入与带验证码的传输入口仍是不同契约；两份原有 comment schema 测试与实现就近归入 schemas/。
- media 的字面量上传策略 catalog 单独位于 types/media.upload-policy.ts，门禁仅允许无依赖的字面量常量；它不是 enum 合集或 schemas/DTO 混装例外。

## 导出级完整路径映射

以下每个旧文件中的列举符号迁到右侧具体文件；未列出的原有具名文件仅更新消费引用。原路径删除或仅移出其中的 enum，相关 UI options/组件仍原地保留。

### category

| 原文件      | 目标文件与保留符号                                                                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema.ts` | `schemas/category.insert.schema.ts`：`CategoryInsertSchema`<br>`schemas/category.update.schema.ts`：`CategoryUpdateSchema`<br>`schemas/category.list.schema.ts`：`CategoryListQuerySchema`<br>`schemas/category.delete.schema.ts`：`CategoryDeleteSchema`                      |
| `server.ts` | `server/category-commands.ts`：`createCategory`、`updateCategory`、`destroyCategories`<br>`server/category-queries.ts`：`findCategory`、`categoryPathExists`、`listCategories`、`getCategoryTree`                                                                              |
| `types.ts`  | `types/category.insert.ts`：`CategoryInsertInput`、`CategoryInsert`<br>`types/category.update.ts`：`CategoryUpdate`<br>`types/category.list.ts`：`CategoryListInput`、`CategoryVisibility`<br>`types/category.record.ts`：`CategoryNode`、`CategoryRecord`、`CategoryListItem` |

### comment

| 原文件                                 | 目标文件与保留符号                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/options.ts`                     | `types/comment.status-name.ts`：`CommentStatusName`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `comment-status.ts`                    | `types/comment.status.ts`：`CommentStatus`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `schema.ts`                            | `schemas/comment.fields.schema.ts`：`CommentSiteSchema`<br>`schemas/comment.public.schema.ts`：`PublicCommentBaseSchema`、`PublicCommentSchema`<br>`schemas/comment.update.schema.ts`：`CommentUpdateSchema`                                                                                                                                                                                                                                                                                                                                |
| `schemas/comment.insert.schema.ts`     | `schemas/comment.insert.schema.ts`：`CommentInsertBaseSchema`、`CommentInsertSchema`<br>`schemas/comment.fields.schema.ts`：`CommentSiteSchema`                                                                                                                                                                                                                                                                                                                                                                                             |
| `schemas/comment.list.query.schema.ts` | `schemas/comment.list-query.schema.ts`：`CommentListQuerySchema`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `schemas/comment.query.schema.ts`      | `schemas/comment.query.schema.ts`：`CommentQuerySchema`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `types.ts`                             | `types/comment.insert.ts`：`PublicCommentInput`、`CommentInsertInput`、`CommentRequestMetadata`<br>`types/comment.update.ts`：`CommentUpdate`<br>`types/comment.query.ts`：`CommentListInput`、`CommentRefInput`<br>`types/comment.target.ts`：`CommentTarget`、`CommentTargetReference`、`CommentTargetState`<br>`types/comment.read-model.ts`：`CommentRecord`、`CommentRelatedRecord`、`CommentListItem`、`CommentPreviewListItem`、`PublicCommentNode`<br>`types/comment.notification.ts`：`NotificationComment`、`NotificationSetting` |

### dashboard

| 原文件      | 目标文件与保留符号                             |
| ----------- | ---------------------------------------------- |
| `server.ts` | `server/dashboard-queries.ts`：`getStatistics` |

### link

| 原文件      | 目标文件与保留符号                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts` | `schemas/link.insert.schema.ts`：`LinkInsertSchema`<br>`schemas/link.update.schema.ts`：`LinkUpdateSchema`<br>`schemas/link.list.schema.ts`：`LinkListQuerySchema`                                    |
| `server.ts` | `server/link-operations.ts`：`createLink`、`updateLink`、`destroyLinks`、`listLinks`                                                                                                                  |
| `types.ts`  | `types/link.insert.ts`：`LinkInsert`<br>`types/link.update.ts`：`LinkUpdate`<br>`types/link.list.ts`：`LinkListInput`、`LinkListQueryInput`、`LinkVisibility`<br>`types/link.record.ts`：`LinkRecord` |

### media

| 原文件             | 目标文件与保留符号                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delete-result.ts` | `types/media.delete.ts`：`MediaDeleteResult`                                                                                                                                                                                                                        |
| `schema.ts`        | `schemas/media.record.schema.ts`：`MediaRecordSchema`<br>`schemas/media.list.schema.ts`：`MediaListQuerySchema`、`MediaIdSchema`<br>`schemas/media.delete.schema.ts`：`MediaDeleteSchema`<br>`schemas/media.upload.schema.ts`：`MediaRegisterUploadSchema`          |
| `server.ts`        | `types/media.storage.ts`：`MediaStorage`<br>`server/media-upload.ts`：`prepareMediaUpload`、`registerMediaUpload`<br>`server/media-delete.ts`：`destroyMedia`                                                                                                       |
| `types.ts`         | `types/media.record.ts`：`MediaRecord`<br>`types/media.list.ts`：`MediaListInput`、`MediaIndexInput`                                                                                                                                                                |
| `upload-policy.ts` | `types/media.upload.ts`：`MediaUploadFile`、`MediaUploadIntentInput`<br>`types/media.upload-policy.ts`：`MEDIA_MIME_TYPES`、`MEDIA_MAX_BYTES`、`MEDIA_MAX_BATCH_FILES`<br>`schemas/media.upload.schema.ts`：`MediaUploadFileSchema`、`MediaUploadIntentInputSchema` |

### menu

| 原文件                     | 目标文件与保留符号                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/menu-transforms.ts` | `types/menu.type-name.ts`：`MenuTypeName`                                                                                                                                                                     |
| `menu-types.ts`            | `types/menu.type.ts`：`MenuType`                                                                                                                                                                              |
| `schema.ts`                | `schemas/menu.write.schema.ts`：`MenuWriteSchema`<br>`schemas/menu.save-snapshot.schema.ts`：`MenuSaveSnapshotSchema`                                                                                         |
| `server.ts`                | `server/menu-commands.ts`：`saveAllMenus`<br>`server/menu-queries.ts`：`listMenus`、`getMenuSnapshot`<br>`server/menu-revisions.ts`：`bumpMenuRevisionForPageDeletion`、`bumpMenuRevisionForCategoryDeletion` |
| `types.ts`                 | `types/menu.write.ts`：`MenuInput`<br>`types/menu.save-snapshot.ts`：`MenuSaveSnapshot`<br>`types/menu.list.ts`：`MenuVisibility`、`MenuItem`                                                                 |

### page

| 原文件             | 目标文件与保留符号                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `admin/options.ts` | `types/page.status-name.ts`：`PageStatusName`<br>`types/page.template-name.ts`：`PageTemplateName`                                                                                                                                                                                                                       |
| `page-status.ts`   | `types/page.status.ts`：`PageStatus`                                                                                                                                                                                                                                                                                     |
| `page-template.ts` | `types/page.template.ts`：`PageTemplate`                                                                                                                                                                                                                                                                                 |
| `schema.ts`        | `schemas/page.fields.schema.ts`：`PageFieldsSchema`<br>`schemas/page.insert.schema.ts`：`PageInsertSchema`、`PageCreationResultInputSchema`<br>`schemas/page.update.schema.ts`：`PageUpdateSchema`<br>`schemas/page.delete.schema.ts`：`PageDeleteSchema`<br>`schemas/page.list-query.schema.ts`：`PageListQuerySchema`  |
| `server.ts`        | `server/page-commands.ts`：`createPage`、`getPageCreationResult`、`destroyPages`、`updatePage`、`incrementPageViews`                                                                                                                                                                                                     |
| `types.ts`         | `types/page.insert.ts`：`PageFields`、`PageInsert`<br>`types/page.update.ts`：`PageUpdate`<br>`types/page.delete.ts`：`PageDelete`<br>`types/page.list-query.ts`：`PageVisibility`、`PageInput`、`PageListQueryInput`<br>`types/page.read-model.ts`：`PageRecord`、`PageWithRelations`、`PageListItem`、`PageMenuOption` |

### post

| 原文件                      | 目标文件与保留符号                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/options.ts`          | `types/post.status-name.ts`：`PostStatusName`<br>`types/post.type-name.ts`：`PostTypeName`                                                                                                                                                                                                                                                                                                                                                                                  |
| `post-read-model.ts`        | `schemas/post.read-model.schema.ts`：`PostCategoryRecordSchema`、`PostAuthorRecordSchema`、`PostWithRelationsSchema`、`PostListResultSchema`、`PublicPostListItemSchema`、`PublicPostListResultSchema`、`AdminPostListItemSchema`、`AdminPostListResultSchema`                                                                                                                                                                                                              |
| `post-search.ts`            | `schemas/post.search.schema.ts`：`PostSearchInputSchema`<br>`types/post.search.ts`：`PostSearchInput`、`PostSearchResult`                                                                                                                                                                                                                                                                                                                                                   |
| `post-status.ts`            | `types/post.status.ts`：`PostStatus`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `post-type.ts`              | `types/post.type.ts`：`PostType`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `public/PostInfo/index.tsx` | `types/post-info.align.ts`：`Align`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `schema.ts`                 | `schemas/post.fields.schema.ts`：`PostFieldsSchema`、`PostRelationPatchSchema`<br>`schemas/post.insert.schema.ts`：`PostInsertSchema`、`PostCreationResultInputSchema`<br>`schemas/post.update.schema.ts`：`PostUpdateSchema`<br>`schemas/post.delete.schema.ts`：`PostDeleteSchema`<br>`schemas/post.list-query.schema.ts`：`PostListQuerySchema`                                                                                                                          |
| `types.ts`                  | `types/post.insert.ts`：`PostFields`、`PostRelationPatch`、`PostInsert`<br>`types/post.update.ts`：`PostUpdate`<br>`types/post.delete.ts`：`PostDelete`<br>`types/post.list-query.ts`：`PostVisibility`、`PostListInput`、`PostListQueryInput`<br>`types/post.read-model.ts`：`PostCategoryRecord`、`PostAuthorRecord`、`PostWithRelations`、`AdminPostListItem`、`AdminPostListResult`、`PostListResult`、`PublicPostListItem`、`PublicPostListResult`、`PostDetailResult` |

### setting

| 原文件      | 目标文件与保留符号                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts` | `schemas/setting.admin-update.schema.ts`：`SettingAdminUpdateSchema`<br>`schemas/setting.patch.schema.ts`：`SettingPatchSchema` |
| `server.ts` | `server/setting-queries.ts`：`getSetting`<br>`server/setting-update.ts`：`updateSetting`                                        |
| `types.ts`  | `types/setting.record.ts`：`SettingRecord`、`SettingViewModel`<br>`types/setting.patch.ts`：`SettingPatch`、`SettingUpdate`     |

### tag

| 原文件        | 目标文件与保留符号                                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`   | `schemas/tag.insert.schema.ts`：`TagInsertSchema`<br>`schemas/tag.update.schema.ts`：`TagUpdateSchema`<br>`schemas/tag.list.schema.ts`：`TagListQuerySchema`<br>`schemas/tag.record.schema.ts`：`TagRecordSchema` |
| `server.ts`   | `server/tag-commands.ts`：`createTag`、`updateTag`、`destroyTags`<br>`server/tag-queries.ts`：`listTags`                                                                                                          |
| `tag-kind.ts` | `types/tag.type.ts`：`TagType`                                                                                                                                                                                    |
| `types.ts`    | `types/tag.insert.ts`：`TagInsertInput`、`TagInsert`<br>`types/tag.update.ts`：`TagUpdate`<br>`types/tag.list.ts`：`TagListInput`、`TagListQueryInput`<br>`types/tag.record.ts`：`TagRecord`                      |

### user

| 原文件                    | 目标文件与保留符号                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-user.ts`           | `types/user.current.ts`：`AdminUser`<br>`server/admin-user.ts`：`getAdminUser`                                                                                                                                                                                                                                            |
| `admin/options.ts`        | `types/user.level-name.ts`：`UserLevelName`<br>`types/user.status-name.ts`：`UserStatusName`                                                                                                                                                                                                                              |
| `schema.ts`               | `schemas/user.write.schema.ts`：`UserInsertSchema`、`UserUpdateSchema`<br>`schemas/user.list.schema.ts`：`UserListQuerySchema`                                                                                                                                                                                            |
| `server/user-commands.ts` | `types/user.insert.ts`：`UserCommandInput`                                                                                                                                                                                                                                                                                |
| `types.ts`                | `types/user.record.ts`：`UserRecord`<br>`types/user.current.ts`：`CurrentUserRecord`<br>`types/user.insert.ts`：`UserInsert`、`UserCommandInput`<br>`types/user.update.ts`：`UserUpdate`、`UserUpdateCommandInput`<br>`types/user.list.ts`：`UserListInput`、`UserListQueryInput`<br>`types/user.login.ts`：`LoginValues` |
| `user.ts`                 | `types/user.level.ts`：`UserLevel`<br>`types/user.status.ts`：`UserStatus`<br>`types/user.current.ts`：`CurrentUser`<br>`rules/user-status.ts`：`isUserEnabled`                                                                                                                                                           |

## 额外共享实现整理

- category/server.ts 的 withTranslations 移入既有 server/category-translations.ts；tag/server.ts 的同名 loader 移入既有 server/tag-translations.ts，保留原函数体及服务端边界。
- setting/server.ts 的 toSettingRecord 移入既有 server/setting-translations.ts；menu 跨模块修订函数集中 server/menu-revisions.ts，分类与页面命令依赖这一明确入口。
- user 的 isUserEnabled 原函数体现位于 rules/user-status.ts；getAdminUser 迁入 server/admin-user.ts，AdminUser 在 types/user.current.ts 等价引用 CurrentUserRecord。
- comment-dto、page-transforms、post-transforms 对 DB schema 的 typeof-only 导入显式改成 import type，不改变转换函数体。

## 消费方与门禁

生产页面、管理 UI、router、server、DB schema、认证、tRPC、脚本、测试和 mock 统一指向具体入口，不依赖新 barrel。独立静态复核 257 组旧/新源码中的 1959 个仍使用的 import binding，来源均保持。

架构测试动态发现 types/schemas/server/rules 目录，覆盖一枚举一文件、禁止旧根入口与 contract barrel、schema 推导方向、展示枚举的 DB/server 逆向依赖，以及 runtime server-only 与 type-only 纯转换边界。既有覆盖率阈值、测试分组及 CI 分片策略不降级。工程 feature-architecture、type-safety-governance、目录模板与阅读地图同步。

## 等价核验

- 203 条迁移导出映射全部解析成功。200 个声明在归一共享 version helper 名称后 AST 相同；2 个原转导出指向现有权威声明；1 个 AdminUser 为等价静态类型别名整理。
- 44 个被删除的生产文件共 228 个非 import 顶层声明经过独立查漏；未遗漏原有导出。
- 排除直接拆分文件与共享 helper 宿主后，400 个原生产文件的非 import/转导出正文不变。
- 枚举值、schema 初始化器、默认值/转换/partial、事务与副作用函数体均保持。

## 最终验证

本地最终验证（2026-10-22）：

| 检查                              | 结果                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| check-types（Next typegen + tsc） | 通过                                                               |
| ESLint、git diff --check          | 通过                                                               |
| 架构门禁（覆盖率集中的子集）      | 21 文件、260 测试通过                                              |
| 全量非进程测试 + V8 覆盖率        | 441 文件、3125 测试通过                                            |
| 进程门禁与负向 Next build fixture | 6 文件、102 测试通过                                               |
| 完整非 E2E 合计                   | 447 文件、3227 测试通过                                            |
| 生产构建（Next + Serwist）        | 通过                                                               |
| OpenSpec strict + diff 检查       | 69 项通过                                                          |
| 覆盖率                            | statements 93.24%、branches 88.44%、functions 93.04%、lines 94.38% |

构建及数据库用例只使用本轮独占临时 SQLite，执行迁移与确定性种子后运行；最终验证清理成功，没有访问远程数据库。先前发现的旧 mock/路径断言和展示枚举门禁缺口均修复后重新验证，未通过降低阈值或删测试回避问题。

浏览器 E2E：可发现清单为 development 66 项、production 1 项；当前 Chromium、Firefox、WebKit 的预期 Playwright 可执行文件均不存在。实际浏览器测试未执行，沿用已披露的浏览器下载受限环境，不重试已拒绝操作或绕过限制，不以 --list 代替通过。

独立静态审查未发现产品行为 P1/P2。最终展示/schema 门禁实扫 163 个业务文件、98 个 catalog、40 个 schema、64 个 types，且负例验证能够捕获逆向依赖。

## schemas/ 命名补充

按确认后的命名约定，10 个实际 feature 契约目录统一采用 schemas/（39 个实现与 2 个就近测试）；server/ 表达执行边界，不改为 services/。types/、枚举内容、.schema.ts 后缀、lib/db/schema 与其他数据库路径保持不变。旧单数目录也纳入禁止回归检查。此轮对照命名调整前的 770020b 基线，543 个生产源码文件（含 scripts）的 AST 等价，18 个 feature 枚举文件内容不变；数据库 schema、迁移及历史报告未改动。类型、Lint、21 个架构文件的 260 个测试、完整非 E2E 的 447 个文件 / 3227 个测试、生产构建与 69 项严格规格检查全部通过。覆盖率保持 statements 93.24%、branches 88.44%、functions 93.04%、lines 94.38%。测试仅使用本轮独占临时 SQLite，已验证清理。E2E 清单为开发 66 项、生产 1 项；当前无 Playwright 浏览器可执行文件，未执行真实浏览器用例，既有下载阻塞不通过其他入口绕过。

## 服务端测试位置补充

根 server.test.ts / server.integration.test.ts 已按被测职责迁入 server/ 具名测试。只有 menu/page 的混合职责拆分，事务与并发场景不拆断；完整用例映射、断言和 fixture 基线见[服务端测试迁移记录](server-test-migration.md)。

## 纯规则与 schema 测试职责补充

根 rules.ts 已迁入具名 rules/，根 schema.test.ts 按被测 schema 就近拆分；完整跨契约场景保留。符号与逐用例分组、等价检查见[规则与 schema 测试迁移记录](rules-schema-test-migration.md)。
