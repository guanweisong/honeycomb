## 1. 建立失败基线

- [x] 1.1 为 Serwist Route 增加 `/en/offline` 必须显式进入 precache 配置的失败测试，并确认当前实现失败。
- [x] 1.2 为 `public/sw.js`、source map 和 `public/workbox-*` 遗留资产增加失败门禁，并确认当前资产触发失败。
- [x] 1.3 为 Feature 根目录业务端口文件和未接线事件基础设施增加失败边界测试，并确认 User/Event 现状触发失败。
- [x] 1.4 为默认 Metrics 的结构化输出、非法标签过滤和 writer fail-open 增加失败测试，并确认 noop 默认实现无法满足要求。

## 2. 修复 PWA 生产离线链路

- [x] 2.1 在 Serwist Route 显式预缓存 `/en/offline`，保持文档导航 fallback 使用同一 URL，并运行聚焦单测。
- [x] 2.2 删除旧 `public/sw.js`、对应 source map 和 `public/workbox-*` 文件，验证生成清单不再包含遗留项。
- [x] 2.3 使用生产 build + start 模式重复运行 PWA 离线 Chromium E2E，确认未缓存导航稳定呈现离线提示和重试按钮。

## 3. 删除未使用领域事件基础设施

- [x] 3.1 更新 Post、Page、Comment、User 聚合测试，使其只验证状态转换、不变量和错误，不依赖 pending events。
- [x] 3.2 从聚合与 Application command handlers 删除事件类型、pending event 队列、`pullEvents` 和可选 Event Bus 参数。
- [x] 3.3 删除 `InProcessEventBus`、核心事件注册器及只验证这些死抽象的测试，复扫生产源码确认没有隐藏消费者。
- [x] 3.4 运行四个核心 Feature 的 Domain、Use Case、Router 和副作用相关测试，确认持久化结果与错误映射保持不变。

## 4. 收敛 User Application 契约

- [x] 4.1 记录 User command/query、credential、login history 契约及全部消费者，确定 Application 内唯一权威文件和导出路径。
- [x] 4.2 将根目录端口定义移动到 `src/features/user/application`，通过引用或重新导出复用唯一类型，不复制字段清单。
- [x] 4.3 更新 Infrastructure、Presentation、Router、认证和测试消费者，删除根目录兼容文件与旧导入路径。
- [x] 4.4 运行 User、认证、边界和唯一事实源测试，并扫描其他 Feature 根目录确认没有同类端口泄漏。

## 5. 落地本地结构化指标

- [x] 5.1 新增可注入 writer 的 Console Metrics adapter，使用现有指标名和标签目录输出单行 JSON。
- [x] 5.2 将默认 registry 从 noop Metrics 切换为安全包装后的 Console Metrics，同时保留显式注入和重置能力。
- [x] 5.3 验证 counter、duration、服务/环境字段、标签清洗、敏感数据禁止和 writer 异常隔离。
- [x] 5.4 更新 instrumentation、可观测性文档和关键覆盖率清单，使默认运行时行为与声明一致。

## 6. 安全、依赖与高价值测试

- [x] 6.1 增加六位密码和 CSP `unsafe-inline` 决策的一致性测试与风险说明，不改变当前兼容性行为。
- [x] 6.2 根据覆盖率报告补充登录校验和关键 Admin 授权/mutation 行为测试，不为纯组合页面增加低价值测试。
- [x] 6.3 运行实时生产依赖审计并检查相关上游兼容版本；可安全修复时升级目标依赖和 lockfile。
- [x] 6.4 若无法兼容升级，验证并刷新精确依赖例外、缓解措施、负责人、跟进条件和到期时间；网络不可用时记录未验证。

## 7. 文档与 OpenSpec 收尾

- [x] 7.1 对齐 README 中的 Next.js 版本、Node engine、Application 契约归属、Upstash 生产行为、PWA、默认指标及安全接受风险。
- [x] 7.2 更新架构、复杂度、依赖审计和测试说明，删除被 OpenSpec 完整覆盖且未被引用的重复临时文档。
- [x] 7.3 校验 `harden-end-to-end-type-safety` 的增量规格同步状态与完成任务，并按 OpenSpec 流程归档该旧变更。
- [x] 7.4 更新本变更 verification，逐项记录已执行命令、结果、环境限制和未验证边界。

## 8. 完整质量验证

- [x] 8.1 运行 `bun run check-types`、`bun run lint`、`bun run db:migrations:check` 和 `git diff --check`。
- [x] 8.2 运行 `bun run test:unit:run`、`bun run test:unit:coverage` 与 `bun run test:unit:process`，保持阈值不降低。
- [x] 8.3 使用隔离假配置运行生产 `bun run build` 和 `bun run analyze`，确认不连接真实数据库。
- [x] 8.4 运行 CI 关键 Playwright E2E，确保安全响应头、RBAC 与 PWA 离线用例全部通过。
- [x] 8.5 复扫死代码、旧出口、重复契约、遗留 Service Worker 资产和工作树状态，确认 OpenSpec tasks 与实际结果一致。
