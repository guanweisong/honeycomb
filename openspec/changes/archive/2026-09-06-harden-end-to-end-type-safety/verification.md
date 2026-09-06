# 类型安全加固验证记录

验证日期：2026-09-05。

## 实施结果

- 全工程在 strict 基础上开启 noUncheckedIndexedAccess，覆盖源码、脚本和测试。
- 生产代码开启五项类型感知 no-unsafe Lint 规则，补充实际 ESLint 回归测试。
- Repository 写入结果必须存在；领域枚举在数据库读取边界验证，缺失值按真实 DTO 表达。
- 表单区分 Zod input/output，提交使用 schema 解析产物；表格查询、空路由参数和可空展示值显式处理。
- 缓存、验证码、会话、浏览器存储、DOM 表单和静态图片适配边界验证真实数据。
- 清除业务 DTO 整体断言和用 as never 伪装业务端口的相关测试夹具；框架测试替身保留独立边界。
- 更新未命中、无写入结果等 ApplicationError 经 tRPC 映射为正确错误码。

## 最终验证

| 检查 | 结果 |
| --- | --- |
| bun run check-types | 通过 |
| bun run lint | 通过，包含类型感知规则 |
| bun run test:unit:coverage | 246 文件、1080 测试通过，所有覆盖率阈值通过 |
| CI=true bun run test:unit:process | 2 文件、52 测试通过 |
| bun run build | 隔离副本内默认 Turbopack 生产构建通过，26 个静态页面生成完成 |
| git diff --check | 通过 |

覆盖率：语句 82%，分支 74.91%，函数 80%，行 83.13%。未降低任何覆盖率阈值。

构建使用 `/private/tmp/honeycomb-type-build.eg6gev`，未复制 `.env*`，清空继承环境后仅传入必要 PATH 和假配置；数据库地址为不可达的 `http://127.0.0.1:1`。沙箱首次阻止 Turbopack 本地端口，隔离失败缓存并经权限审批重跑后通过。没有连接生产数据库。

## 保证范围与保留边界

- 不承诺 TypeScript 或第三方声明在数学意义上绝对可靠。第三方声明仍由 skipLibCheck 隔离，框架运行时行为须继续依靠集成测试。
- 保留 as const、验证非空字符串后建立 AggregateId 品牌，以及 Header 的具名固定菜单树适配。不是以消除所有 as 字符为目标。
- 五项类型感知规则适用于生产 src；测试/测试辅助文件仍经过 strict 和索引安全检查，但不强加相同的隐式 any 规则。第三方不完整测试替身与故意非法输入测试不等同于业务契约。
- 本轮未运行浏览器 E2E 或真实外部服务集成测试，未提交 commit，未归档 OpenSpec 变更。
- 未改变数据库 schema、迁移和依赖。限流、缓存版本失效算法、通知可靠投递和公开字段裁剪属于其他问题，本次未处理。

## 唯一事实源追加验证

- 多语言规则由 domain 所有；媒体、标签、文章读取模型由所属 application schema 所有，类型从 schema 推导，缓存解码复用同一 schema。
- contracts 只重新导出权威模型；公开评论与后台评论分别命名。当前用户、写入结果检查、缓存键、表格元数据及重复标签字段配置已收敛。
- 完整本地化、部分本地化、可空输入，以及作者快照与身份模型保留各自语义；不会仅因结构相似而强行合并。缓存版本算法、设置部分语言持久化问题及公开字段裁剪未在本轮改变。
- 新增 7 项唯一事实源结构门禁，先观察旧代码失败再实施；另有 8 项共享 schema 行为测试，覆盖自定义校验消息、可空输入、schema 组合引用和缓存往返。

| 检查 | 追加变更后的结果 |
| --- | --- |
| bun run check-types | 通过；无增量检查也通过 |
| bun run lint | 通过 |
| 相关单元测试 | 5 文件、54 测试通过 |
| bun run test:unit:coverage | 248 文件、1095 测试通过，阈值未降低 |
| CI=true bun run test:unit:process | 2 文件、52 测试通过 |
| bun run build | 同一隔离副本与假配置下通过，26 个静态页面生成完成 |
| openspec validate harden-end-to-end-type-safety --strict | 通过 |

最新覆盖率：语句 81.96%，分支 74.72%，函数 80.06%，行 83.11%。本轮同样未运行浏览器 E2E，未提交或归档。

### 技能治理验证

- `type-safety-governance/SKILL.md` 是规则唯一正文，扩充描述使正常类型、schema、DTO、ViewModel、常量及转换代码生成命中；前端与 DDD 技能仅引用该规则。
- 规则要求生成前搜索概念与消费者、确定所有者；复用权威 schema/type/helper，公开桶只重新导出；禁止为了赶进度或保留签名复制定义。不同业务语义必须明确区分，运行时公开字段裁剪不能用 Omit 代替。
- 独立场景基线在缓存任务中手写了第二份 schema，并保留重复 contracts；更新规则后的独立场景选择所有者 schema、类型推导和重新导出。这是各一次定向场景验证，不代表穷尽所有生成行为。
- 内置技能校验脚本因环境缺少 PyYAML 未能运行；使用 Bun YAML 解析验证三个修改技能的 frontmatter、名称、描述限制和占位符检查，全部通过，未新增依赖。

## 全面复审优化验证

验证日期：2026-09-05。对应 tasks 第 5 节。

- Post/Page/Media/Link 写入 schema 归所属 Application，命令类型从 output 推导；原输入出口重新导出同一实例。中文校验和完整/部分语言的原有语义保持不变，共用校验不反向依赖 tRPC。
- 评论 query、command、notification 三个仓库共用 toCommentRecord；通知仍显式追加 post/page，公开映射保持独立。Post 列表/详情及 AdminUser 复用权威类型。
- OAuth ID、名称与配置筛选统一；登录页、账号安全、登录历史标签复用目录。登录历史事件由身份包所有，数据库、端口和 UI 引用。
- 八个业务查询输入与 DataTable 共用分页基础契约；API updatedAt、Repository createdAt、表格每页 20 条的不同策略显式保留。数据库默认枚举只改为领域值引用，SQL 语义、数据库结构和历史迁移不变。
- 缓存命名空间由单个目录提供给 Feature、缓存白名单与指标标签。指标中的同名 procedure 字符串属于不同语义，保留。路由语言从公共集合派生且保持 en/zh 顺序，页面内容清洗复用共享函数。
- 删除两个无生产消费者的旧可见性枚举文件，更新引用旧路径的边界测试；Git 中可恢复。未修改依赖、状态流转、权限决策、缓存版本算法或公开字段裁剪。

| 检查 | 最终结果 |
| --- | --- |
| bun run check-types | 通过 |
| bun run lint | 通过，无告警 |
| bun run test:unit:coverage | 250 文件、1128 测试通过，阈值未降低 |
| CI=true bun run test:unit:process | 2 文件、52 测试通过 |
| 隔离副本 bun run build | 通过，26 个静态页面生成完成 |
| openspec validate harden-end-to-end-type-safety --strict | 通过 |
| git diff --check | 通过 |

覆盖率：语句 82.13%，分支 74.81%，函数 80.22%，行 83.15%。构建仍使用无真实环境变量的临时副本和不可达数据库假地址，未连接生产服务。

新增所有权门禁观察过旧代码失败，再验证改造通过；新增行为测试覆盖 schema 实例复用、可空文章输入、页面完整语言、媒体大小约束、API 默认值、路由顺序、枚举空集合和缓存指标目录。

独立只读评审发现通知映射遗漏，补充失败门禁后修复并复核通过。最终验证另捕获了 DataTable 页码被窄化为字面量 1 和枚举列表构造触发权限门禁；分别通过显式真实状态类型及无断言非空枚举转换修复，没有放宽门禁。

最终对 504 个非测试 TS/TSX 文件复扫，三字段以上完全相同的手写接口/对象别名只剩 LinkMutationFeedback 与 CommentMutationFeedback：分别属于独立操作回调边界，不为三个相同回调创建通用业务抽象。这不是对所有语义重复的数学完备证明；不同命令/传输入口的可空性、内部 ID、验证码扩展等仍按其边界语义保留。本轮未运行浏览器 E2E，未提交或归档。
