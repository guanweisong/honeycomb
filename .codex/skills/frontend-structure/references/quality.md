# 质量门禁

## 可读性与规模

注释解释原因、约束和副作用，不复述代码；公共 API 和复杂业务规则补充中文 JSDoc。单文件超过约 300 行应评估拆分，超过约 600 行必须拆分或记录例外；测试文件约 500/1000 行同理。

## 测试与验证

修改后按范围运行：

```bash
bun run check-types
bun run lint
bun run test:unit:run -- <相关测试>
```

涉及构建、路由、认证或端到端行为时，再运行对应 build/E2E。完成前执行 `git diff --check`，确认无重复定义、旧入口、无用导入和越界依赖。

长期治理应尽量自动化：配置 import boundary、Server/Client 边界和 Domain 禁止依赖基础设施的静态检查；文档规则只保留需要判断的架构决策。

至少应有 CI 门禁验证：Client 不依赖服务端模块、Domain 不依赖基础设施、Feature 不越界引用、共享包满足准入规则。架构边界违规必须阻断 CI；文件规模超限默认先告警，超过硬阈值才阻断。架构规则变更必须同步更新边界测试。

## 评审清单

- 调用路径是否是满足责任所需的最短路径？
- 是否新增了没有独立职责的层、wrapper 或共享模块？
- UI、Router、Use Case、Domain、Repository 的依赖方向是否正确？
- Server Component 是否只绕过 Use Case 执行简单查询，是否避免直接写入 Repository？
- UI 是否只接收稳定读取模型，是否避免接收 ORM/数据库记录？
- Repository 接口是否默认位于 Application，Use Case 是否只依赖接口而不是 Infrastructure 实现？
- 类型、schema、权限和业务规则是否存在多个事实源？
- 不同边界的模型转换是否显式，是否错误复制了业务规则？
- 是否复用了已有 UI、查询、Repository 和测试？
- Feature 是否绕过公开契约直接引用其他 Feature 内部文件？
- Server/Client 边界、缓存、错误和权限是否被测试覆盖？
- 是否有自动化边界检查，而不是只依赖人工记忆？
- 是否清理了迁移产生的旧入口和重复代码？
- OpenSpec 任务、测试和文档是否同步？
