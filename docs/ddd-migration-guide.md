# 单服务 DDD 迁移说明

## 目标

本工程采用单服务模块化单体，不拆分微服务、不更换数据库、不改变现有 tRPC、
Admin 和公开页面接口。DDD 的目标是隔离业务规则与技术细节，而不是增加无意义
的层次。

## 新模块约定

- `domain`：聚合、值对象、领域错误、领域事件；禁止导入 Drizzle 和 Next.js。
- 简单 CRUD：`application/*-use-cases.ts` 负责命令、查询和用例编排；复杂业务在 domain 中承载不变量。
- `infrastructure`：repository、数据库映射、存储和第三方服务适配器。
- `application/repository.ts`：模块 Application 边界的仓储协议和稳定读写契约；具体实现位于 `infrastructure`。
- `*.router.ts`、`admin`、`public`：只负责入口适配、权限和依赖注入，不复制领域规则。

## 核心聚合

存在稳定业务不变量的模块可定义聚合：例如发布、审核或账号状态流转。聚合在
成功更新后可发布领域事件，副作用通过事件处理器执行，并要求处理器具备幂等性；
简单 CRUD 不强制创建聚合或领域事件。

## 新增功能流程

1. 复杂模块先在 feature 的 `domain` 中定义状态和不变量；简单 CRUD 从 `application` 用例开始。
2. 在 `application/repository.ts` 中定义 Repository 接口和稳定读写契约；Domain 不访问 Repository。
3. 简单模块在 `application` 用例中编写注入端口的命令和查询；复杂模块才增加聚合和领域事件。
4. 在 `infrastructure` 中实现数据库映射，禁止把 Drizzle 类型泄漏到 domain、application 或 presentation。

## 类型安全边界

- Application Repository 必须使用明确 DTO，禁止显式 `any`、开放式 `Record<string, any>` 和 `no-explicit-any` 抑制。
- 用例函数只接收实际使用的端口子集，例如 `Pick<Repository, "find" | "update">`，使测试 fake 能直接满足真实契约。
- 优先用源类型修正、控制流窄化、类型谓词和显式空值分支替代断言；测试不得用 `as never` 掩盖不完整 fixture。
- `as const`、校验后构造的品牌类型以及第三方泛型无法表达时的最小适配断言可以保留；非显然双重断言必须在局部说明边界原因。
- Drizzle、Better Auth 等未公开内部结构的测试应通过单一辅助函数集中建立 `unknown` 边界，调用点使用正常类型。
5. 在 feature 根部 router，或按需保留的 admin/public 入口中接入现有入口。
6. 增加 fake repository、边界测试和至少一个失败路径测试。

## 稳定性原则

不新增 facade、空接口层或重复的兼容出口。简单查询可直达 Query/Repository；改变状态、触发副作用或需要多步骤协调的行为必须通过 Application Use Case，并由类型检查、单元测试和架构边界测试保证入口稳定。
