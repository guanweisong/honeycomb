# 质量门禁

## 可读性与规模

注释解释原因、约束和副作用，不复述代码；公共 API 与复杂规则补充中文 JSDoc。单文件超过约 300 行应评估拆分，超过约 600 行必须拆分或记录例外；测试文件约 500/1000 行同理。不要为满足数字增加无职责 wrapper。

## 选择验证范围

按范围运行 `bun run check-types`、`bun run lint`、相关测试及 `git diff --check`。架构、共享契约或大范围治理改动运行全量单元、进程与覆盖率；涉及构建、路由、认证或端到端行为时运行 build 及对应开发/生产 E2E。用户限定验证范围或环境阻塞时分别报告未运行项，不能记作通过。

- 架构断言按[规则索引](architecture.md)对应的 Requirement 选择，静态边界通过不替代真实行为测试。
- 覆盖范围、允许排除与最低门槛以[覆盖率规范](../../../../openspec/specs/coverage-governance/spec.md)为准；实际配置在 [vitest.config.mts](../../../../vitest.config.mts)，由[覆盖率门禁](../../../../tests/tooling/coverage-governance.test.ts)验证，不在文档另抄阈值。
- 测试分组、命令及 CI/E2E 运行方法见[测试指南](../../../../tests/README.md)。保留完整 Chromium 库存，关键场景不条件跳过；Service Worker 排除所需的真实离线 E2E 未运行时明确标为未验证。
- 需要数据库时，**REQUIRED SUB-SKILL:** Use [test-database-safety](../../test-database-safety/SKILL.md)。

## 交付检查

对照本次涉及的规范 Scenario 复核行为，报告改动文件、验证命令及通过/失败/未运行结果。检查旧消费者、mock、配置与出口是否清理完整；只更新实际受影响的说明及 OpenSpec，不为一次规则调整在多个文档复制相同正文。
