# 架构边界

## 主调用路径

- Client 查询：`UI → tRPC Query → Server Query/Router → Repository`。适用于列表、详情、搜索等读取；客户端调用方式和服务端实现路径属于同一次查询。
- Server Component：简单查询可直接调用服务端 Query/Repository；Repository 必须返回稳定的读取模型或经过 Query 映射的结果，不得直接暴露 ORM/数据库记录。业务操作必须调用 Use Case，不得直接调用写入 Repository。不为了形式统一绕 tRPC。
- 业务操作：`UI → Router → Use Case → Repository`。Use Case 负责流程、输入后的业务动作、权限组合和副作用编排。

Domain 是业务操作中的可选能力：

```text
UI → Router → Use Case
                  ├─ Domain
                  └─ Repository
```

只有存在稳定、可复用且需要独立测试的业务不变量时才引入 Domain。Domain 不依赖 Repository；Use Case 负责协调 Domain 和 Repository。

Router 是 tRPC/HTTP 传输适配器，只处理输入校验、身份/能力入口校验、调用和输出映射。Router 出现多步业务判断、多个数据源调用、状态变更顺序或副作用时，必须提取 Use Case。

Query 只负责读取适配、查询组合和结果映射，不承载写入、跨步骤业务流程或外部副作用。

权限职责必须分层：Router 校验外部请求是否可进入，Use Case 校验业务操作是否被允许；二者不得对同一可信调用重复实现同一规则。

## 依赖方向

- Client UI 依赖 Router/Query 的客户端契约，不依赖数据库、Repository 和服务端实现。
- Server Component 属于服务端组合层；简单查询可直接调用 Query/Repository，业务操作必须调用 Use Case，不得把服务端实现传入 Client Component。
- Use Case 依赖 Domain 契约和 Repository 抽象；不把 HTTP、React 或数据库细节带入业务流程。
- Domain 不依赖 Next.js、tRPC、ORM、浏览器 API 或基础设施。
- Repository 封装持久化和外部服务；禁止把业务流程藏在查询函数里。
- Repository 返回稳定的读取模型或领域可用数据，不向 UI 泄漏 ORM、数据库连接、懒加载对象或基础设施细节。
- Repository 接口统一放在 Application，具体实现放在 Infrastructure；Use Case 只依赖接口，不依赖持久化实现。Domain 永远不访问 Repository。
- Feature 不得导入其他 Feature 的内部文件；跨功能依赖通过公开契约或 Application 边界。

## Application 边界

`src/features/<feature>/application/` 放单功能用例；`src/packages/application/` 只放跨功能编排。后者不能成为无边界的“万能 service”。

## 复杂度控制

- 共享模块至少有两个真实消费者；否则留在拥有它的功能内。
- `src/packages` 不是默认归宿；只有跨功能且边界稳定的代码才能进入。
- `src/packages/domain` 只承载跨功能、稳定且可独立测试的领域能力；功能专属规则留在 feature 内。Domain 永远不访问 Repository。
- 只有独立职责、可替换性或稳定边界才增加 wrapper/adapter。
- 禁止同一业务同时维护旧 service、新 use case，或两套模型、权限和校验入口。
- 例外必须在变更说明中写明原因、影响和退出条件；例外不能成为默认模板。
