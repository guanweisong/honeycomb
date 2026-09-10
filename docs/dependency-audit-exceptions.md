# 生产依赖审计例外

生产依赖审计会阻断所有可达的 High 或 Critical 告警，除非例外同时精确匹配告警 ID 和带版本的完整依赖路径。例外不得包含通配符，必须填写负责人、缓解措施和未过期的复核日期。

## 2026-09-10 复核结果

- 工程和 CI 已升级到 Bun 1.4.2，并使用嵌套 override 将 `@parcel/watcher` 下的 `picomatch` 定向升级到 4.0.7，不影响仍依赖 picomatch v2 的其他链路。
- 已实时执行 `bun run audit:production`，生产可达性审计通过：0 项阻断发现，0 项例外。

## 生效中的例外

当前无生效中的例外。

机器可读事实源位于 `scripts/dependency-audit-exceptions.json`，修改例外时必须同步本文件。
