## 背景

基线 master 7f088b73648a506f3a7f8fc5dc07e8e0dd1a948e。Next 16.4.2；Bun 显式构建 worker，Next 不自动发现 sw.ts。实际调用为 build-serwist → sw → cache 策略；两个 sitemap route → sitemap-data → 延迟 tRPC；恢复测试覆盖 blog/admin/global。

## 目标与非目标

仅归组 8 个文件和同步必要消费者、配置、门禁与当前规范。不得改变业务、URL、缓存策略、断言或覆盖率阈值；不动 auth、404、Provider 与其余根入口，不提交或发布。

## 决策

- PWA 六文件整体归 app/pwa，basename 与相对依赖保持；不用普通共享 lib 承载应用路由策略，不留旧转发壳。构建输出仍 public/serwist/sw.js，scope / 与 header 不变。
- sitemap-data 归 app/lib/server，显式 server-only 并加入架构入口保护。保留动态 tRPC 导入、缓存 key/tag、分片及 XML 和降级逻辑。精确关键文件阈值和 protected patterns 跟随新路径，不扩大排除。
- 三边界恢复测试归 tests/integration/framework-error-recovery.test.tsx，只改组件导入；既有 error-boundaries 的上报测试不合并。测试逻辑、矩阵与钩子迁前后对比。
- 类型台账保留历史 id，仅更新 currentFile/currentLine/当前 authority；历史归档和旧计划不机械重写。

## 风险与取舍

- 源路径被工具显式消费 → 搜索全部引用，先更新路径契约并验证失败，再迁移和定向验证。
- worker 源文件移动不证明生产离线有效 → 完整构建及真实生产 PWA E2E；浏览器不可用则明确未验证。
- 新 server-only 可能揭示错误消费者 → 架构、类型与构建验证，不删除边界标记来掩盖失败。

## 迁移与回退

一次本地分支内完成路径、配置和规范同步；无 DB 数据迁移。验证只用独占可丢弃 file 数据库。回退时按同一映射反向迁移全部配置和消费者，不能只回退源码。
