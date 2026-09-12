# 数据与契约一致性验证记录

验证日期：2026-09-12  
验证分支：`master`（用户明确要求直接在当前分支实施）

## 实施结果

- Setting 后台更新、内部 nullable patch 与 Menu 保存命令分别由所属 Application schema 作为唯一事实源；transport 只重导出权威实例，Repository 写入类型由 schema 推导。
- Comment 写路径只依赖 `PublicContentInvalidator.invalidate(plan)`；数据库提交后的缓存失败最多重试一次，并以 `completed | degraded` 返回，不再覆盖已提交的业务结果。
- 媒体删除保留“对象存储优先”的幂等语义；对象删除后数据库阶段异常返回 `indeterminate`，后台刷新列表并保留选择供重试。
- Link、Category、Post 及其关联 Category 等持久化枚举在读写边界使用领域枚举；最终源码复扫发现并修复了 `PostCategoryRecordSchema.status` 退化为任意字符串的问题，新增缓存拒绝未知关联分类状态的 RED/GREEN 回归测试。
- SQLite migration 增加权威枚举 CHECK、非负数 CHECK、评论目标 XOR 与 Setting 单例约束；迁移入口先做只读审计，不自动清洗歧义数据。
- 迁移门禁双向验证 SQL、Journal、Snapshot，并在独占 SQLite 中重放和比较 schema；Feature 门禁覆盖全部生产 TypeScript 源码，只允许本 Feature、`features/contracts` 与显式 `public` 出口。

## 验证证据

| 验证项 | 命令 / 结果 |
| --- | --- |
| 静态门禁 | `bun run check-types && bun run lint && bun run db:migrations:check && git diff --check`：退出码 0；4 份 migration 工件治理通过。 |
| 完整单元测试 | 独占随机 `file:` SQLite、`local-final-verification-sentinel` 与退出清理 trap 下运行 `bun run test:unit:run`：299/299 文件、1451/1451 测试通过。 |
| 覆盖率 | 同一隔离环境运行 `bun run test:unit:coverage`：299/299 文件、1451/1451 测试通过；Statements 85.8%、Branches 77.97%、Functions 84.19%、Lines 87.01%。 |
| 进程级测试 | 同一隔离环境运行 `bun run test:unit:process`：2/2 文件、52/52 测试通过，未遗留子进程。 |
| 最终枚举补漏 | 新测试先观察到未知关联分类状态被缓存接受；修复后 6 个相关文件 48/48 测试通过，随后 `check-types` 与 `lint` 通过。 |
| 本地迁移 | 随机临时 SQLite 下 `bun run db:migrate`：审计后 4 份 migration 应用成功。 |
| 生产构建 | `bun run build` 两次均在 Turbopack 处理 CSS 时因宿主禁止创建子进程/绑定本地端口而中止（`Operation not permitted`，第二次已请求非沙箱执行）；同一源码、环境变量和已迁移临时数据库执行 `bun next build --webpack`：退出码 0，26/26 页面生成成功。 |
| OpenSpec | `openspec validate harden-data-and-contract-consistency --strict`：valid。 |
| 临时资源 | 验证、失败构建、webpack 构建与生产迁移演练均使用随机 `/private/tmp/honeycomb-*` 目录与即时 trap；结束后目录扫描无结果。生产迁移只使用已提交的 `db:migrate`，未运行 `drizzle-kit push`。 |

Vite 输出了未来 `configLoader: native` 兼容性提示；webpack 构建输出了 Serwist 内部 browserslist 动态 `require` 的既有静态分析 warning。二者均未造成测试或 webpack 生产构建失败。本机 `bun run build` 的 Turbopack 结果按事实保留，不将环境权限失败记作通过。

## 刻意保留的不同语义

- `SettingAdminUpdateSchema` 表达后台表单完整更新；`SettingPatchSchema` 表达内部局部更新和显式清空。二者共享字段事实源，但不能合并成同一命令。
- 缓存 `degraded` 表示数据库结果已经提交、公开缓存同步修复未完成；媒体 `indeterminate` 表示对象已删除后数据库结果无法确认。两者不可复用同一状态。
- 列表查询中的字符串数组是 transport 过滤表达，不冒充已验证的持久化枚举；Repository 返回的领域状态必须在持久化边界解析。
- 缓存完整计划重试允许版本额外单调提升；不承诺无后台执行器时的最终必达。

## 生产迁移执行记录

用户于 2026-09-12 明确授权备份和迁移目标
`libsql://honeycomb-guanweisong.aws-ap-northeast-1.turso.io`。执行顺序和结果：

1. 迁移前 `bun run db:invariants:audit`：通过，无不兼容数据。
2. 生产快照保存到
   `/Users/guanweisong/Documents/backups/honeycomb/20260912T054209Z`；目录权限
   `0700`、文件权限 `0600`，`PRAGMA integrity_check=ok`。主数据库文件
   SHA-256 为
   `dbeb49f71e654d61fb53afe9c6fc9f2df12e50dd43b901be36291333d79c9f27`，
   其余 sidecar 校验值保存在同目录 `metadata.json`。
3. 在备份的随机临时副本运行 `bun run db:migrate` 和迁移后不变量审计：均通过；副本随后清理，原始备份未修改。
4. 对生产数据库运行 `bun run db:migrate`：成功；随后
   `bun run db:invariants:audit`：通过。
5. 只读验收确认 `PRAGMA integrity_check=ok`；ledger 最新 hash
   `aeedb211135ddcbbb5e68c1a64ea4cff5ab55be957740d5dc5e773e5ce2da96b`
   与 `drizzle/0003_enforce_persistence_invariants.sql` 的 SHA-256 一致；25 个
   CHECK 与 `setting_singleton_idx` 已存在。
6. 迁移前后关键表计数一致：category 16、post 56、page 1、setting 1、tag
   242。一次最终只读查询在连接阶段遇到瞬时 TLS 证书错误，未执行 SQL；同一查询重试成功。

本次仅完成数据库备份、迁移与数据库侧验收，没有执行应用部署或线上 smoke
test。若后续发现需要回滚 schema，只能使用单独审查的前向 migration 或从已验证备份恢复，不执行即兴逆向 DDL。
