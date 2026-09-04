## 1. 建立治理基线

- [x] 1.1 新增会失败的类型安全治理测试，检查生产 Application Repository 契约中的显式 `any` 和 `no-explicit-any` 抑制
- [x] 1.2 运行聚焦测试确认它因现有 Category、Link 契约而按预期失败
- [x] 1.3 记录生产代码与测试代码中的 `as any`、`as never`、双重断言、普通断言和非空断言清单，并按“可清理 / 合理保留”分类

## 2. 收紧 Application Repository 契约

- [x] 2.1 依据现有 schema、Use Case 消费者和持久化返回值，为 Category 定义明确 DTO 并删除显式 `any`
- [x] 2.2 调整 Category Infrastructure 映射与测试，使收紧后的契约通过类型检查和聚焦测试
- [x] 2.3 依据现有 schema、Use Case 消费者和持久化返回值，为 Link 定义明确 DTO 并删除显式 `any`
- [x] 2.4 调整 Link Infrastructure 映射与测试，使收紧后的契约通过类型检查和聚焦测试
- [x] 2.5 运行治理测试并确认从红灯转为绿灯

## 3. 清理生产代码断言

- [x] 3.1 审计并清理 App Router 中可由准确参数类型、空值分支或不变量检查替代的普通断言和非空断言
- [x] 3.2 审计并清理各 feature 的 Application、Infrastructure、Presentation 与 UI 中可明确建模的断言
- [x] 3.3 审计并清理共享 packages 中可明确建模的断言，保持品牌类型和第三方适配边界最小化
- [x] 3.4 为新增的运行时空值或不变量分支先补失败测试，再实施对应窄化逻辑
- [x] 3.5 为必须保留的非显然生产断言添加具体边界说明，并确认没有新增 `as any`、`as never` 或无说明双重断言

## 4. 收紧测试类型边界

- [x] 4.1 使用类型化 Repository fake、接口子集或 fixture 工厂替代 feature 与跨模块测试中可清理的 `as never`
- [x] 4.2 使用显式存在性检查或测试辅助函数替代可清理的 DOM 与集合非空断言
- [x] 4.3 集中 Drizzle、Better Auth、React 与其他第三方内部结构测试的必要 `unknown` 边界，并将目标结构缩至最小
- [x] 4.4 使用 `satisfies` 或准确泛型替代可清理的普通测试断言，确保 fixture 会随真实契约变化产生类型错误

## 5. 完善自动化治理

- [x] 5.1 扩展类型安全治理测试，使其避免误报 `as const`、Vitest `expect.any`、导入别名和英文文本
- [x] 5.2 删除已经不再需要的 ESLint 抑制，并验证所有保留抑制都有第三方边界原因
- [x] 5.3 更新相关架构文档，记录断言保留原则、治理范围和清理后的基线
- [x] 5.4 新增项目级类型安全治理 Skill，沉淀 DTO、断言、测试 fake 与第三方适配边界的判断规则

## 6. 全量验证

- [x] 6.1 运行 `bun run check-types` 和 `bun run lint`
- [x] 6.2 运行 `bun run test:unit:run` 和 `bun run test:unit:coverage`
- [x] 6.3 运行 `bun run build`
- [x] 6.4 运行 `git diff --check`，复核外部 API、数据库 schema、迁移和依赖均未改变
