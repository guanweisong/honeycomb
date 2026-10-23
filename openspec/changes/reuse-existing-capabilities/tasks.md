## 1. 运行机制

- [x] 1.1 评估并暂缓不等价的媒体 infinite query；按页查询竞态修复与 RTL 两份试点通过真实 QueryClient 回归。
- [x] 1.2 UTCDateMini 保留格式与跨时区测试。
- [x] 1.3 RHF 提交状态覆盖 imperative promise 并保留业务锁。
- [x] 1.4 Tiptap 官方订阅通过真实 marks/选区回归。
- [x] 1.5 核对 Next pending 差异并记录暂缓，不改变 UX。

## 2. 原生与测试复用

- [x] 2.1 服务端 Map.groupBy 保留遍历、SQL预算和事务行为。
- [x] 2.2 Bun JSONC 仅 CLI 使用且 Node import 安全。
- [x] 2.3 文件扫描复用现有 helper，保持 symlink/异常/排除政策；tinyglobby 暂缓。
- [x] 2.4 架构导入检查复用 TypeScript AST。
- [x] 2.5 原生 Promise.withResolvers 保留控制时序。
- [x] 2.6 测试 AbortSignal.timeout 共享且原传输测试保留。

## 3. 收口验证

- [x] 3.1 依赖许可/生产审计与完整类型、lint、覆盖率、进程、构建、规格验证。
- [x] 3.2 独立代码审查、真实 diff、暂缓/未验证清单与临时资源清理核验。
