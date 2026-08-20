# 单服务 DDD 迁移说明

## 目标

本工程采用单服务模块化单体，不拆分微服务、不更换数据库、不改变现有 tRPC、
Admin 和公开页面接口。DDD 的目标是隔离业务规则与技术细节，而不是增加无意义
的层次。

## 新模块约定

- `domain`：聚合、值对象、领域错误、领域事件；禁止导入 Drizzle 和 Next.js。
- 简单 CRUD：模块根部 `service.ts` 负责命令、查询和用例编排；复杂业务才拆分 command/query 文件。
- `infrastructure`：repository、数据库映射、存储和第三方服务适配器。
- `repository.ts`：模块内部仓储协议和读写模型类型。
- `transport`、`admin`、`public`：只负责入口适配、权限和依赖注入，不复制领域规则。

## 核心聚合

Post 聚合负责发布与撤回；Comment 聚合负责审核状态流转；User 聚合负责账号
状态变化和管理员保护。三者在成功更新后发布领域事件，副作用通过事件处理器
执行，并要求处理器具备幂等性。

## 新增功能流程

1. 复杂模块先在 feature 的 `domain` 中定义状态和不变量；简单 CRUD 直接从 `service.ts` 开始。
2. 在模块根部 `repository.ts` 中定义 repository 端口和读写模型类型。
3. 简单模块在 `service.ts` 编写注入端口的命令和查询；复杂模块才拆分文件。
4. 在 `infrastructure` 中实现数据库映射，禁止把 Drizzle 类型泄漏到 domain 或 service。
5. 在 feature 根部 router，或按需保留的 transport/admin/public 入口中接入现有入口。
6. 增加 fake repository、边界测试和至少一个失败路径测试。

## 稳定性原则

不新增 facade、空接口层或重复的兼容出口。发生变化时，直接修改模块根部用例和
仓储协议，并由类型检查、单元测试和架构边界测试保证入口稳定。
