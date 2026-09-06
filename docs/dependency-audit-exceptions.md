# 生产依赖审计例外

生产依赖审计会阻断所有可达的 High 或 Critical 告警，除非例外同时精确匹配告警 ID 和带版本的完整依赖路径。例外不得包含通配符，必须填写负责人、缓解措施和未过期的复核日期。

## 2026-09-06 复核结果

- 已实时执行 `bun audit --production`，漏洞库返回 17 项原始告警（9 High、7 Moderate、1 Low）。Bun 的该视图同时列入了开发工具链，因此不能直接等同于生产可达结果。
- `bun outdated` 确认 `next-intl@4.14.2` 没有新的兼容版本；限定执行 `bun update next-intl` 也未改变受影响的传递解析。
- 锁文件确认 Serwist 链路的 `brace-expansion` 已为修复版 5.0.9；Vite、ESLint、Vitest 和 shadcn 告警位于开发工具链。
- 项目脚本 `bun run audit:production` 的二次联网调用被执行环境策略拒绝，未把历史清单或离线判断伪装为本次脚本通过；最终验证仍应在允许该脚本联网的 CI 环境执行。

## 生效中的例外

### GHSA-c2c7-rcm5-vvqj

- 精确路径：`next-intl@4.14.2>@parcel/watcher@2.5.6>picomatch@4.0.3`
- 到期时间：2026-12-01
- 负责人：maintainer
- 原因与缓解：`@parcel/watcher` 仅在 next-intl 的源码监听/构建工具路径中处理受信任的工程文件；生产请求不会调用它，也不能提供 glob 表达式。Bun 不支持嵌套 override，而全局覆盖 picomatch 会违反仍要求 v2 的其他消费者范围。
- 跟进条件：`next-intl` 或 `@parcel/watcher` 解析到 `picomatch >=4.0.4` 时立即删除例外；最迟在到期日前重新执行实时生产可达性审计。

机器可读事实源位于 `scripts/dependency-audit-exceptions.json`，修改例外时必须同步本文件。
