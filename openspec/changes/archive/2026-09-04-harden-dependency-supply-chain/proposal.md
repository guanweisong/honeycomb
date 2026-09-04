## Why

当前 CI 只阻断 Critical 漏洞，完整审计仍报告多个 High 漏洞，其中包含生产直接依赖和运行时可达链路。需要升级依赖并把生产风险、开发工具风险和有期限的例外明确分离。

## What Changes

- 升级存在已知漏洞的直接依赖和可安全更新的传递依赖。
- 必要时允许主版本升级或替换生产依赖，但保持现有产品行为和外部协议。
- 优先消除富文本清洗、编辑器、数据库客户端及浏览器运行时中的 High/Critical 风险。
- 将 CI 调整为阻断生产依赖中的 High/Critical 漏洞。
- 为无法立即修复的传递漏洞建立窄例外，记录路径、可达性、补偿措施、负责人和到期日。
- 更新依赖审计文档和回归测试。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `dependency-supply-chain-hygiene`: 将供应链门禁从仅 Critical 提升为面向生产可达 High/Critical 风险的持续治理。

## Impact

- 影响 `package.json`、`bun.lock`、CI、依赖审计脚本/测试和例外文档。
- 可能调整 `sanitize-html`、Tiptap 等依赖的适配代码与测试。
- 不改变公开 API、数据库 schema 或用户可见业务语义。
