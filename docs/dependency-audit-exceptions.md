# 生产依赖审计例外

生产依赖审计会阻断所有可达的 High 或 Critical 告警，除非例外同时精确匹配告警 ID 和带版本的完整依赖路径。例外不得包含通配符，必须填写负责人、缓解措施和未过期的复核日期。

## 2026-09-10 复核结果

- 工程和 CI 已升级到 Bun 1.4.2，并使用嵌套 override 将 `@parcel/watcher` 下的 `picomatch` 定向升级到 4.0.7，不影响仍依赖 picomatch v2 的其他链路。
- 已实时执行 `bun run audit:production`，生产可达性审计通过：0 项阻断发现，0 项例外。

## 2026-10-22 依赖升级复核

- 验证工具链为 Node.js 24.22.1 / Bun 1.4.3；生产可达性审计为 0 项发现、0 项例外。原 sanitize-html 告警随正常升级至 2.18.1 消除，未新增豁免。
- `@parcel/watcher` 2.6 已使用兼容的 picomatch v4 范围，移除旧定向 override；正常锁文件解析仍得到 4.0.7。移除不再必要的 browserslist override，保留已有的 esbuild 兼容修补，并将已有 PostCSS 修补同步至 8.5.31。
- 全部开发依赖图不等于生产可达图，仍有两个已知告警：`braces` 3.0.3 尚无官方修复版；`@tailwindcss/typography` 0.5.20 精确依赖旧 `postcss-selector-parser` 6.0.10，不能通过正常范围解析取得修复。未使用跨版本强制覆盖掩盖上游兼容性问题。
- 后续复核：[braces 公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)、[selector-parser 公告](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)。上述开发依赖记录不是生产审计例外，也不表示整张依赖图已无漏洞。

## 生效中的例外

当前无生效中的例外。

机器可读事实源位于 `scripts/dependency-audit-exceptions.json`，修改例外时必须同步本文件。
