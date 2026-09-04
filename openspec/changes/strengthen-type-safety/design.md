## 背景

工程已经启用 TypeScript 严格模式，并通过 Zod、tRPC 和 Drizzle 建立了主要数据链路的类型约束。但当前仍有两类问题：一是 Category、Link 等 Application Repository 契约使用开放式 `Record<string, any>`，使跨层协议失真；二是生产代码和测试中存在数量较多的类型断言与非空断言，其中一部分可以由更准确的源类型、运行时窄化或类型化测试替身替代。

本变更横跨 Application、Infrastructure、App Router、UI 和测试辅助代码。约束是保持外部 API、数据库结构和运行时语义不变，并遵守现有轻量 DDD 边界：Application 拥有 Repository 接口，Infrastructure 负责持久化映射，Transport 负责运行时输入校验。

## 目标与非目标

**目标：**

- 使生产 Application Repository 契约不再包含显式 `any`。
- 清除能够准确建模的普通断言、双重断言和非空断言。
- 用类型化 fixture 和结构化 fake 改善测试边界，减少 `as never` 对真实契约问题的掩盖。
- 为高风险类型逃逸建立可执行的回归门禁。
- 对必须保留的非显然断言给出局部、具体的边界理由。

**非目标：**

- 不追求字符层面的“零断言”；`as const` 等合法类型表达不属于债务。
- 不启用 `noUncheckedIndexedAccess` 或 `exactOptionalPropertyTypes`。
- 不调整 tRPC procedure、Zod 输入协议、数据库 schema 或迁移。
- 不借机重构无关业务逻辑、UI 或第三方依赖。

## 技术决策

### 决策一：以明确 DTO 替代开放式记录

Application Repository 契约必须显式描述用例实际读取和写入的字段。DTO 可以依赖领域枚举和稳定共享值类型，但不得依赖 Drizzle schema 或 tRPC output。Infrastructure adapter 负责把 DTO 映射为 Drizzle insert/select 类型。

选择该方案而不是从 Zod schema 直接推导全部 Application 类型，是因为运行时传输协议和应用层端口具有不同的演化方向；直接复用会让 Application 重新依赖 Transport。也不使用 `unknown` 替换 `any` 来维持开放记录，因为这只会把类型问题推迟到消费者。

### 决策二：按信息来源优先级消除断言

每个断言按以下顺序处理：

1. 修正不准确的源类型；
2. 使用控制流、类型谓词或判别联合窄化；
3. 缺失值合法时显式返回或渲染 fallback；
4. 缺失值违反不变量时抛出领域或应用错误；
5. 外部库无法表达该边界时保留最窄的适配断言并说明原因。

不新增通用 `cast<T>()` 辅助函数，因为这会隐藏而不是消除类型逃逸。

### 决策三：生产代码优先，测试替身随后收紧

先修复生产契约，再让测试 fixture 实现这些真实契约。测试优先使用 `satisfies`、`Pick<Interface, ...>`、类型化工厂和小型结构 fake。必须存在的 DOM 节点通过可复用断言函数或显式检查建立运行时保证，而不是散布非空断言。

低层测试如果必须观察 Drizzle、Better Auth 或框架未公开的内部结构，可以保留单一 `unknown` 边界；其目标结构必须最小化且不得包含 `any`。

### 决策四：门禁针对高风险模式，不禁止全部断言

新增静态治理测试，检查生产 Application Repository 契约中的显式 `any` 和 `no-explicit-any` 抑制，并检查本次变更新增的 `as any`、`as never` 或无说明双重断言。

普通断言采用审计基线和代码评审，而不做全仓正则禁止。绝对禁止会误伤品牌类型、第三方适配和字面量窄化，并诱导开发者用更隐蔽的方式绕过检查。

### 决策五：采用分批红绿重构

每一批先增加能够暴露目标类型逃逸的失败测试或触发预期类型错误，再做最小修复。每批完成后运行聚焦测试和类型检查，最终运行全量质量门禁。这样可以把大范围类型重构拆成可验证的小步，避免一次性修改掩盖运行时变化。

## 风险与权衡

- **DTO 收窄遗漏实际字段** → 从现有 Zod schema、Use Case 消费者和 Infrastructure 返回值三方交叉确认，并运行 router 与 repository 测试。
- **删除断言导致隐含运行时行为变化** → 优先修正类型，不主动增加异常；确需运行时检查时为缺失分支补测试。
- **测试清理产生大量低价值改动** → 只清理能够提高契约真实性或错误诊断质量的断言，第三方内部检查允许保留集中边界。
- **静态规则误报英文文本或 `expect.any`** → 将治理范围限定到生产 Application Repository 文件，并匹配 TypeScript 类型语法及 ESLint 抑制。
- **范围持续膨胀** → 编译器严格选项、第三方类型升级和业务行为重构保持在本次范围外。

## 迁移方案

1. 建立当前类型逃逸清单和失败的治理测试。
2. 修复 Application Repository DTO 与对应 Infrastructure 映射。
3. 依次清理生产 App Router、feature、package 和 UI 中可证明多余的断言。
4. 更新测试 fixture 和辅助函数，使其满足收紧后的真实契约。
5. 运行类型检查、Lint、全量单元测试、覆盖率、生产构建与 diff 检查。

本变更不涉及部署数据迁移。若某批类型收窄导致无法保持外部返回结构，应回退该批代码并保留有说明的边界断言，而不是修改公开协议。

## 实施基线

初始审计将现有类型逃逸分为以下三组：

- **必须清理**：Category、Link Application Repository 的显式 `any`；App Router 页面、Header、MediaGrid、SettingClient、Menu 与 Comment adapter 中可通过空值分支或类型谓词替代的非空断言；测试 Repository fake 中用于绕过真实契约的 `as never`。
- **优先验证后清理**：查询结果到 View Model 的普通断言、DataTable/Tiptap 等泛型适配断言、测试中的 DOM 和 JSON 结构断言。只有源类型或运行时检查能够完整表达约束时才移除。
- **合理保留**：`as const` 字面量窄化；校验非空后构造 `AggregateId` 的品牌类型断言；检查 Drizzle、Better Auth 等未公开内部结构时集中使用的最小 `unknown` 边界；第三方 resolver 泛型不兼容所需的局部适配断言。

治理测试的初始红灯准确报告 7 个违规位置：Category 契约 2 处、Link 契约 5 处；合法的 `as const`、Vitest `expect.any` 和导入别名样例未被误报。

实施后，生产源码中的显式 `any`、`as never` 与 `no-explicit-any` 抑制均降为 0；Application Repository 治理测试由 7 个违规降为 0。测试中的 `as never` 从 116 处降至 40 处（治理测试自身的匹配样例不计入），剩余位置集中在 Drizzle 链式查询、Tiptap/React 组件替身、Better Auth hooks、故意构造非法权限值等第三方或负向测试边界。Drizzle 数据库 fake 已统一通过 `asMockDatabase` 建立单一 `unknown` 适配边界，业务用例 fake 则通过 `Pick<Repository, ...>` 直接接受类型检查。

上述需要人工判断的约束同步沉淀到项目级 `.codex/skills/type-safety-governance/SKILL.md`。该 Skill 明确区分应清理的类型逃逸与可保留的 `as const`、品牌构造和第三方适配边界，并限制完整框架 mock 只能用于低层 adapter/context 测试，避免被业务 fixture 复用为通用强转。

## 开放问题

当前没有阻塞实施的开放问题。更严格编译选项是否启用，将在本变更完成并获得稳定基线后另行评估。
