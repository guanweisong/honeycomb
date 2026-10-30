## 背景

工程是一个 Next.js 模块化单体，旧 packages 六层及 feature 内 application/domain/infrastructure 目录并非独立发布单元。普通操作在多层只转发的函数间跳转，状态、选项和业务类型与使用方分离。当前采用用户批准的简单 feature 设计，保留行为与真实技术边界。

## 目标与非目标

目标是让每个业务的 router、输入、模型、规则、服务端操作和 UI 就近可读，减少文件数和无职责调用跳转，并将新边界纳入自动化检查。

不修改产品行为、URL、tRPC 输入输出、数据库 schema/迁移、依赖或安全配置；不推送、创建 PR、合并、部署或执行生产数据操作。源代码迁移不意味着可以降低安全测试或覆盖率门槛。

## 决策

### 四类职责，而不是 packages 六层

app 负责路由、布局、HTTP 与框架组合；features 负责业务；components 负责通用 UI 和编辑器；lib 负责数据库、认证、缓存、存储、tRPC、可观测性和国际化等技术能力。

没有选择仅把 packages 改名为 lib：原业务状态、schema、类型和展示选项必须回到所属 feature，分类管理归 category，媒体选择归 media。通用编辑器通过注入使用媒体能力。

### 直接 server 函数，而不是固定层级

feature 可用 server.ts，规模与职责需要时才拆 server/。函数直接使用 Drizzle 与技术适配器，承担查询、业务校验、事务、条件写入和副作用顺序。纯规则保留为独立可测试函数。

没有选择保留强制 Repository 接口、factory、Use Case 与 handler：仅转发参数的层不提供保护。具有实际数据库映射、缓存、事务、并发或外部系统适配职责的 helper 可以保留，不能为减少文件误删。

### 根组合留在 app

app/trpc/router.ts 组合 feature router，app/trpc/server.ts 提供 caller。lib/trpc 仅包含公共 core/context/client 及传输工具；客户端可以 type-only 引用根 AppRouter，不能运行时导入根 router。

没有选择由 lib/trpc 组合业务：共享技术库不应成为依赖全部业务的组合根。

认证保留窄技术集成：src/auth.ts 绑定 Better Auth，app/auth 组合登录 hook 与请求审计；lib/trpc/context.ts 仅为会话读取延迟加载 src/auth.ts。该例外不允许 lib/auth 加载业务操作，也不允许 lib/trpc 组合业务 router。

### 纯业务契约由 feature 拥有

跨 feature 可通过明确具体入口复用纯 schema/type/catalog、所属业务有意复用的 UI 或 server 操作，不要求 public barrel 或中央 contracts；禁止 router 耦合、反向 app 依赖及纯模块/浏览器运行时越界。lib/db 与 lib/auth 可以引用这些纯契约，但依赖链不能加载业务 server、UI、通知或 router。纯规则/schema 不引用 ORM、UI 或框架。

保留运行时边界，而不是以目录名证明安全：浏览器不能加载数据库、服务端认证、环境 secret 或 Node-only SDK；Edge 不能加载 Node-only 实现；依赖扫描须处理间接导入和 re-export。

## 风险与控制

- 合并函数丢失校验顺序 → 保留评论验证码、目标可见性、开关与父子同源的独立行为断言。
- 只保留前置查询导致并发回归 → 保留分类 SQL 防环、发布条件和条件写入测试。
- 简化 DTO 泄露信息 → 实际裁剪公开作者/评论字段，保持 GUEST 未发布内容与评论隐私范围，不能用类型别名代替投影。
- 把外部失败误作数据库失败 → 事务提交仍为内容写入成功边界；缓存有限重试后返回 publicSync 降级；通知失败保持评论成功；媒体对象删除后数据库失败保持 indeterminate 结果。
- 文件移动漏掉消费者 → 同步生产 import、测试/mock、配置、脚本与文档，检查旧路径和浏览器/服务端/Edge 依赖。
- 简化编辑器破坏恢复 → 保留草稿恢复、重复保存及媒体选择注入行为测试。
- 重定位可观测性泄露私密数据 → 保留 Sentry 脱敏、运行时隔离及 public DSN 回退。
- 文档被误当验证证据 → 历史审计保留日期与历史标记，本轮所有计数和通过结论必须来自实际命令。

## 迁移与回退

1. 记录基线与回归行为，在独立工作树迁移所有权和导入。
2. 逐业务合并无职责链路，运行受影响行为与权限测试。
3. 同步架构门禁、README、技能和当前 OpenSpec；保留未变更的安全与覆盖率要求。
4. 运行全量单元、进程、覆盖率、类型、Lint、构建及可执行的开发/生产 E2E。数据库仅为独占可丢弃本地 file: 数据库。
5. 独立评审整个 diff 并重跑受影响检查；完成之前保持任务未勾选，不沿用其他变更的旧通过结果。

无 schema 或数据迁移，因此回退是恢复迁移前源码与配置；不需要生产数据库回滚。本任务不执行发布或远程操作。

## 未决事项

架构决策已经明确。最终源码计数、调用链对照和各项运行结果由集成验证补齐；有环境阻塞时精确记录已运行、失败和未运行阶段。

## 工程 SKILL 对照补充

本轮依照已有规则修正测试，而不是修改规则容忍违规：认证 hook 使用 Better Auth 的完整 Session/User 类型夹具和允许的 null 上下文；动态架构门禁覆盖实际存在的 feature 与契约，不固定业务名称、契约数量或要求每个 feature 机械创建 router/server/types/schema。实际 router 的注册完整性及运行时安全检查保留，并增加独立反例验证扫描器。

技能参考文档仅澄清 public 目录用途、框架入口与既有覆盖率例外；不新增例外，不降低阈值，不把历史或环境受限的 E2E 计为本次通过。修复限于测试、规范和文档，生产逻辑与接口不变。
