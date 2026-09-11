## 为什么

当前工程的类型、架构和测试治理已经较成熟，但生产模式下的 PWA 离线导航持续失败，部分领域事件与指标能力只存在于抽象或测试中，User 契约归属和长期文档也与既定边界发生漂移。现在需要把这些“已设计但未闭环”的能力收敛为可执行、可验证且与文档一致的生产行为，避免 CI、运行时事实和工程声明继续分离。

## 变更内容

- 恢复 `/en/offline` 的显式预缓存，修复生产模式离线导航，并删除遗留的 Workbox Service Worker 资产。
- 删除没有生产消费者的进程内领域事件总线、事件注册器、可选总线参数和相关死代码；保留聚合中的真实状态不变量及现有副作用实现。
- 将 User 的 Repository、Credential 与 Login History 端口迁入 `application`，删除 feature 根目录的兼容契约出口，并新增自动化边界门禁。
- 将默认 Metrics 从 noop 改为安全的结构化标准输出，不引入外部可观测性服务、持久化指标、Dashboard 或告警系统。
- 补充 PWA 生成清单、遗留资产、Application 端口归属、默认指标输出、登录和关键 Admin 行为的高价值测试，并保持关键 E2E 在 CI 中执行。
- 实时复核生产依赖；优先通过兼容升级消除现有 `picomatch` 风险，无法安全升级时保留精确、有负责人和到期时间的例外。
- 对齐 README、运行时版本、Upstash 生产语义、PWA 能力、可观测性默认行为和 OpenSpec 状态。
- 保留六位密码下限和 CSP `script-src 'unsafe-inline'`，将二者记录为明确接受的兼容性与缓存策略风险，不宣称已经消除。
- 不修改数据库 Schema、公开 API、序列化数据、权限模型或静态渲染策略。

## 能力

### 新增能力

- `pwa-offline-reliability`：定义离线文档预缓存、失败导航回退、遗留 Service Worker 资产清理和生产浏览器验证要求。

### 修改能力

- `application-metrics`：默认指标实现必须形成经过清洗、低基数的结构化本地输出，同时保持 adapter 故障不影响业务。
- `application-use-case-boundary`：Application 契约必须由 Application 目录真实拥有，并移除没有生产消费者的事件编排抽象。
- `architecture-complexity-governance`：边界门禁必须识别 feature 根目录端口契约、无消费者事件基础设施和遗留 Service Worker 资产。
- `coverage-governance`：被排除的 Service Worker 薄入口必须由可通过的生成清单测试和生产离线 E2E 共同证明。
- `dependency-supply-chain-hygiene`：本轮必须重新审计已记录的传递依赖风险，并优先选择兼容升级而不是扩大 override。
- `documentation-workflow-cleanup`：工程设计、任务和完成状态继续以中文 OpenSpec 为唯一事实来源，并同步长期 README 与已完成变更归档状态。

## 影响

- 主要影响 `src/app/sw.ts`、Serwist Route、`public` 遗留资产、核心 Domain/Application、User feature、Observability adapter 与 registry。
- 测试影响 Vitest 架构/覆盖率门禁、Playwright PWA 与关键 Admin/Login 用例以及 GitHub Actions 质量流程。
- 文档影响 README、依赖审计记录、架构审计记录和 OpenSpec 变更状态。
- 可能进行兼容的直接或传递依赖升级；不得通过不兼容的全局 override 处理单一路径风险。
- 不引入新的外部服务凭据、生产存储、消息系统或数据迁移。
