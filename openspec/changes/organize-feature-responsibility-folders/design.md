## 上下文

基线为本地 78e7f28960883d6cf4bc8123ffd4539a9d9b7f58，与已推送 b4c7eb710ff79182b1b35d4c42e53aa2c68cc7f7 的 tree 相同。11 个 feature 有 191 个生产文件、10 个 types.ts、10 个 schema.ts、8 个 server.ts 和 18 个 TypeScript 枚举。

## 目标与非目标

目标：类型、schema 和服务端实现采用有职责的具体入口；每个枚举独立文件；消费者和门禁完整迁移。
非目标：不修改业务行为、数据库、依赖、CI 编排、测试覆盖范围；不删除本轮发现的无消费者导出；不创建 PR、合并或部署；仅在最终检查通过、披露未验证项后按授权推送现有分支。

## 决策

- types/<feature>.<职责>.ts 与 schemas/<feature>.<职责>.schema.ts；server/ 延用现有具名 kebab-case 实现，不为风格改名整个目录。
- 同一写入职责的基础类型与输入可同文件；每个 enum 单独一个文件。展示名称与对齐 enum 同属 feature/types，但不得被业务 schema、规则和持久化使用，options 数组留 UI。
- schema 是运行时事实源，派生类型仅 import type。schema 可导入中立业务 enum/catalog，不能反向导入派生类型。
- 已有 post/comment/server 保留。page 命令整体迁移；category、tag、menu、setting 按查询/写入拆分，真实共享组装并入既有 helper。link 133 行 CRUD 与 dashboard 79 行统计整体移动，避免无意义微型 helper。
- user 登录 schema 保持独立 UI 语义，account-security 已有子结构不重排；dashboard 没有真实类型/schema需求，不补目录。

## 风险与控制

- 大量 import 和 mock 漏迁 → 按旧模块与导出符号生成映射，检查实际 import、动态加载、文本路径和类型编译。
- schemas/type 同目录产生循环 → 区分纯类型与 enum/catalog，检查传递依赖及负例。
- 移动破坏事务/副作用 → 对比基线声明/初始化器/函数体并运行现有行为回归，不改测试预期。
- 静态门禁扫描空集 → 递归发现新入口并加入违规夹具。

## 迁移与验证

先迁 tag/link 代表模块，再整合其余模块；最终清除旧平铺入口，保留全部导出符号。执行类型、Lint、架构、全量非 E2E、覆盖率、进程门禁、生产构建和可用的 E2E。测试数据库只使用本次独占临时本地文件；浏览器或环境阻塞单独披露。回退只撤销本轮 diff，不覆盖基线已有 106 文件改动。

## 服务端测试职责补充

以 47d7e55b（与远端 cc065091 tree 相同）为本次测试整理基线。8 个根 server.test.ts 和 3 个根 server.integration.test.ts 迁入所属 server/，命名跟随真实实现；9 个单职责文件整体移动，menu 按 commands/queries 拆分，page 按纯 mock 重试与完整命令事务集成拆分，最终 13 个文件。逐用例映射见 docs/server-test-migration.md。

保留原 65 个声明、76 个展开用例、226 处静态 expect 调用及 7 个钩子。真实 SQLite 初始化仍为 34 次，不把 page 的写后查询观察器拆离事务场景，不缩减分类 1101 条批量数据或媒体分块并发场景。只复制必要轻量 input/cache 与 mock 声明，不引入共享 fixture 框架，不修改生产实现、测试环境、覆盖率分母、worker 或 CI 分组。

## 纯规则与 schema 测试职责补充

以本地 8ffb0cc6、远端 10dcd986 的共同 tree 28a8a9ae 为基线。4 个根 rules 实现迁为 5 个具名文件，user 按保护不变量与启用状态拆分，其余完整保持发布或审核职责；不导出私有 helper。8 个相关根测试文件迁为 12 个就近或跨 Feature 具名测试，保留 38 个测试声明、76 个展开用例、66 处静态 expect，0 钩子及数据库 fixture。跨 post/page 的合法输入对照保持单个用例，user.write 的 insert/update 对照保持整体；只复制轻量字面量，不新增 fixture 抽象。具体映射见 docs/rules-schema-test-migration.md。本轮先本地验证，发布另待明确授权。
