## 背景

当前工程已经通过类型检查、Lint、1128 项单元与架构测试、覆盖率门禁、进程测试和生产构建，但生产模式 PWA 离线导航稳定失败。进一步审查发现：Serwist fallback 没有对应预缓存项；旧 Workbox 资产仍进入新预缓存；领域事件仅在测试中接线；User 端口的真实所有者仍位于 feature 根目录；默认指标被 noop adapter 丢弃；部分 README、依赖审计和 OpenSpec 状态与实际行为不一致。

本变更面向维护者和部署者。约束是保持公开 API、数据库 Schema、权限、静态渲染、六位密码兼容性及 CSP `unsafe-inline` 决策，不接入外部可观测性服务，也不引入持久事件系统。

## 目标 / 非目标

**目标：**

- 让生产 Service Worker 确实能够为失败的文档导航返回离线页。
- 删除已经被替换或从未接入生产的抽象和资产。
- 使 Application 成为 User 业务端口的真实唯一所有者。
- 让现有指标埋点默认形成安全、可采集的结构化标准输出。
- 用自动化门禁防止上述问题重新出现，并同步长期文档和 OpenSpec 状态。
- 在不破坏依赖兼容性的前提下重新处理已记录的供应链风险。

**非目标：**

- 不接入 OpenTelemetry、Sentry、Prometheus 或其他外部服务。
- 不实现 Dashboard、告警、Tracing、消息队列或事务 Outbox。
- 不移除 CSP `unsafe-inline`，不改变密码最小长度。
- 不修改数据库、公开输入输出、授权矩阵或 UI 视觉设计。
- 不为提升覆盖率数字而测试无业务判断的纯页面组合代码。

## 决策

### 1. 显式预缓存离线文档

Serwist 的 fallback plugin 只能返回已经进入 precache 的 URL，因此在 `createSerwistRoute` 中显式登记 `/en/offline`。不依赖构建器偶然发现页面，也不使用运行时首次访问来填充 fallback。

备选方案是改用全局 catch handler 动态构造离线 HTML，但会复制页面内容、国际化和安全头语义，因此不采用。另一个方案是仅修改 E2E 等待逻辑，但当前失败发生在受控页面已被 Service Worker 接管之后，不能解决缺失预缓存的根因。

### 2. 删除旧 Workbox 资产

当前注册入口是 `/serwist/sw.js`，根目录 `public/sw.js` 和 `public/workbox-*` 已无生产消费者，却会被 Serwist 当作公共资产预缓存。直接删除这些文件，并以静态门禁禁止同名资产回归。

不保留兼容重定向，因为旧 worker URL 的生命周期由浏览器现有注册处理，继续发布两套 worker 会延长混合缓存状态。

### 3. 删除未接线领域事件而不替换

Post、Page、Comment、User 聚合继续保护状态转换。删除 pending events、`pullEvents`、事件 payload 类型、`InProcessEventBus`、核心注册器以及 command handler 的可选 bus 参数。

生产源码没有创建或注册该总线，因而删除它不应补入新的同步副作用。真实存在的缓存、通知与邮件路径保持当前调用方式；若未来需要跨事务可靠副作用，应另行设计 Outbox，而不是复活可丢失的进程内事件。

### 4. 将 User 端口移动到 Application

把 `ports.ts`、`credential-port.ts`、`login-history-port.ts` 的定义移动至 `user/application`，并由 `application/repository.ts` 或明确的 Application 文件提供权威出口。所有消费者一次迁移，根目录不保留 re-export，以免重新形成两个入口。

类型只移动和复用，不重写字段清单。边界测试从仅禁止根目录 `repository.ts` 扩展为禁止根目录业务端口文件和端口声明。

### 5. 默认指标输出到结构化标准输出

保留现有 `Metrics` 接口和注入方式，新增 Console Metrics adapter。每次 counter 或 duration 操作输出单行 JSON，包含固定事件类型、指标名、操作、数值、时间、服务、环境和已经过目录校验的低基数标签。

不通过 Logger 间接输出，避免指标 adapter 与 Logger/registry 递归。adapter 接受可注入 writer 便于测试，并继续由 `createSafeMetrics` 包装，序列化或输出失败不得改变业务结果。

### 6. 测试聚焦生产契约

PWA 同时使用三层证据：Route 配置测试、生成 worker 清单测试、真实 Chromium 离线导航 E2E。架构门禁覆盖遗留 worker、根级端口和无消费者事件总线。登录与 Admin 只补有输入校验、授权或 mutation 结果的路径。

保留全量覆盖率门槛，不把纯布局或框架薄入口强行纳入关键文件 90/80 门槛。关键 E2E 继续在生产 build + start 模式运行。

### 7. 依赖升级优先，例外精确保留

先运行实时生产可达性审计，再检查 `next-intl` 或其 `@parcel/watcher` 链路是否已有兼容修复。只升级相关直接依赖和 lockfile，不使用会破坏其他 picomatch 主版本消费者的全局 override。

如果上游仍未修复，则保留现有精确路径例外，更新审计日期、验证结果和复核期限。无法联网时不得重写审计结果为通过。

### 8. 安全选择显式化

六位密码和 `script-src 'unsafe-inline'` 是经确认保留的兼容性/缓存策略。测试验证配置与文档一致，但不把它们描述成安全缺陷已修复。后续若改变任一选择，必须通过新的 OpenSpec 评估已有账号和静态缓存影响。

## 风险 / 取舍

- [离线页预缓存可能增加安装体积] → 只增加单个必要文档，并删除更大的旧 Workbox 资产抵消成本。
- [删除事件代码可能遗漏隐藏消费者] → 使用全仓库符号和导入扫描，并以完整类型、单测和状态转换测试验证。
- [标准输出指标增加日志量] → 仅输出已有稳定指标，保留低基数标签和可注入 adapter；不新增自由文本。
- [移动 User 契约产生大范围 import diff] → 先建立失败边界测试，再移动唯一源并一次更新所有消费者，不保留兼容出口。
- [依赖升级引入行为变化] → 限定升级范围，运行完整门禁；无兼容升级时保留例外而不强推 override。
- [保留六位密码和 unsafe-inline 延续风险] → README 明确记录风险，避免形成虚假安全承诺；本变更不扩大其使用范围。
- [PWA E2E 存在浏览器时序波动] → 只等待可观察的 Service Worker ready/controller 条件，不使用任意 sleep，并要求相同用例重复通过。

## 迁移计划

1. 先增加会在当前代码上失败的 PWA、资产、端口与指标测试。
2. 修复 PWA 并删除旧资产，运行聚焦单测和生产 PWA E2E。
3. 删除事件基础设施，保持各聚合与 Use Case 行为测试通过。
4. 迁移 User 端口唯一源并运行边界、User、认证与类型测试。
5. 实现默认 Console Metrics，验证清洗、输出与 fail-open 行为。
6. 补关键测试、同步 README 和审计文档，复核依赖。
7. 运行完整质量门禁并更新本变更 verification。
8. 验证并归档已完成的旧 OpenSpec，再在本变更完成后同步主规格和归档。

回滚按小步提交边界进行：PWA、事件删除、端口迁移、指标输出和文档/依赖互不混合。任何阶段失败时恢复该阶段文件，不修改数据库或生产数据。

## 开放问题

无。外部可观测性、密码策略和 nonce CSP 均已明确排除；供应链是否能直接消除取决于实施时的实时上游版本，处理分支已经定义。
