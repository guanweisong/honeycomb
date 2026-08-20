## Context

当前工程是单服务模块化单体，已经完成 repository 端口治理，但业务行为仍主要由 application 编排，领域模型、聚合边界和领域事件不足。约束是保持现有数据库、tRPC、Admin、公开页面和部署方式不变。

## Goals / Non-Goals

**Goals:**

- 建立 feature 内 domain、application、infrastructure、interfaces 的稳定边界。
- 对全部业务模块建立统一 DDD 模块边界；Post、Comment、User 深度建立聚合和不变量，Category、Link、Media、Menu、Page、Setting、Tag 建立轻量领域模型和明确用例契约。
- 用进程内领域事件承载缓存、通知、邮件等副作用。
- 保持旧 transport API 兼容，并用测试阻止跨模块内部依赖。

**Non-Goals:**

- 不拆分微服务，不引入消息队列，不更换数据库。
- 不把所有简单 CRUD 强行改造成复杂聚合。
- 不在本次变更中重写全部前端页面或迁移全部历史数据。

## Decisions

1. **采用渐进式模块化单体。** 保留 `src/features` 作为模块根目录；核心模块使用少量稳定文件，外围 CRUD 模块不强制套用完整 DDD 目录，避免样板代码膨胀。
2. **核心模块采用轻量 DDD 普通模板。** Post、Comment、User 保留实体/聚合行为、service 用例、repository 和事件；不再强制要求完整的 `interfaces`、`contracts` 和多层 adapter。其余模块维持简单 service + repository。
3. **聚合只暴露行为。** 聚合状态通过命令方法修改，application 不直接修改关键状态字段；repository 负责聚合持久化映射。
4. **领域事件先采用进程内派发。** 事件在应用服务成功提交后派发，处理器负责缓存、通知和邮件；后续如有可靠性需求再替换事件总线实现。
5. **兼容 facade 过渡。** transport 暂时继续调用现有 application 导出，内部逐步转发到新的聚合和用例，完成迁移后再删除 facade。

## Risks / Trade-offs

- [领域模型过度设计] → 只为存在明确不变量的核心流程建立聚合，简单查询保持轻量。
- [迁移期间双重规则] → 新旧入口共用同一领域服务，并增加等价性测试。
- [事件处理失败] → 事件处理器必须可重试且不影响主事务；记录失败观测信息。
- [数据库模型反向污染领域] → domain 只使用领域类型，Drizzle 类型转换限制在 infrastructure。

## Migration Plan

先建立边界测试和共享领域基础类型，再按复杂度迁移全部业务模块，最后迁移事件处理器和剩余用例。每阶段保持类型检查、单测、构建和接口契约通过；任一阶段失败时保留 facade 回滚到原 application 实现。

## Open Questions

- 是否需要为领域事件增加持久化 outbox，取决于通知可靠性要求。
- Post 与 Tag 的关系是否属于 Post 聚合，需根据未来编辑事务边界最终确认。
