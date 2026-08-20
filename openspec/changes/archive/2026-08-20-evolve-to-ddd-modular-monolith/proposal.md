## Why

当前工程已经具备 feature 垂直拆分、application/infrastructure 分层和 repository 端口，但领域模型仍偏薄，核心业务规则分散在用例、传输层和基础设施中。现在进行单服务 DDD 演进，可以在不引入微服务运维成本的前提下，建立聚合、不变量、领域事件和模块公开契约，降低后续业务扩展的耦合风险。

## What Changes

- 将现有 feature 演进为单服务模块化 DDD 结构，保留一个进程、一个部署单元和现有数据库。
- 为 category、comment、link、media、menu、page、post、setting、tag、user 全部建立明确的模块边界；对核心业务建立领域模型、聚合根和值对象，对简单模块采用轻量领域模型。
- 将 application 明确为用例编排层，将领域行为迁移到 domain，将数据库访问保留在 infrastructure。
- 建立模块公开契约，禁止跨模块访问内部 domain、application 和 infrastructure 实现。
- 为发布、评论审核、用户状态变化等关键行为建立领域事件，并将通知、缓存和邮件改为事件处理器。
- 保持现有 tRPC、Admin、公开页面和数据库兼容，采用渐进迁移，不进行一次性数据重写。

## Capabilities

### New Capabilities

- `domain-module-boundaries`: 定义单服务 DDD 模块的层次、公开契约和依赖方向。
- `domain-aggregates`: 定义所有业务模块的聚合边界及 Post、Comment、User 的核心不变量和状态行为。
- `domain-events`: 定义领域事件、事件处理器和副作用解耦规则。

### Modified Capabilities

- `feature-persistence-boundaries`: 将当前 repository 端口进一步纳入 DDD application/domain 边界。
- `capability-entrypoint-registry`: 将授权入口归属和模块公开契约纳入统一治理。

## Impact

- 影响全部 `src/features/*`、`src/packages/domain`、`src/packages/identity`、tRPC transport、Admin Action 和测试目录。
- 新增领域模型、值对象、聚合、领域事件和模块边界测试。
- 不改变部署形态，不拆分服务，不要求新增消息队列；事件先在进程内可靠处理。
- 迁移期间需要维护旧 application API 的兼容 facade，完成模块迁移后再删除。
