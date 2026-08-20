# 设计

## CI 门禁

增强现有 `.github/workflows/quality.yml`，保留缓存、进程型测试、覆盖率 artifact 和安全 E2E，并统一 CI 测试环境变量。CI 使用长度足够的非生产 `AUTH_SECRET`，避免构建日志产生误导性的弱密钥警告。工作流继续调用 `package.json` 中已有脚本，不引入新的构建逻辑。

## 文档一致性

新增 `tests/documentation-consistency.test.ts`，检查 README 中记录的脚本确实存在、关键路径确实存在、已废弃路径和命令不再出现，并检查测试文档使用当前覆盖率基线。

新增 `tests/quality-workflow.test.ts`，检查质量工作流继续使用 Bun 锁文件安装、Turbopack 构建入口以及类型、Lint、单元测试、覆盖率、进程测试、critical audit 和安全 E2E 门禁。

## Admin 测试

优先消化已有 TODO 的 `MultiLangText` 行为测试，覆盖空值占位、默认中文和语言切换。后续 Admin 业务流程继续依赖已有 feature-local 测试和 E2E，不通过重复测试单纯追求覆盖率数字。

## 前台交互测试

评论表单覆盖匿名身份字段、已保存身份、回复取消、pending 禁用和提交事件转发，保持评论输入边界和交互状态可回归验证。

## 验证

- `bun run check-types`
- `bun run lint`
- `bun run test:unit:run`
- `bun run test:unit:coverage`
- `bun run build`
- `bun audit --audit-level=critical`
- 在支持 Turbopack 子进程和端口绑定的 CI runner 上执行 `bun run analyze` 与安全 E2E。
