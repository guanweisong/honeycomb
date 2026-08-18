## Why

当前业务功能分散在 `src/app`、`src/packages/application` 和 `src/packages/trpc` 多个技术目录中，开发者处理一个功能时需要跨越多个目录查找页面、查询、转换、传输和用例代码。现在已有清晰的技术边界，适合在不改变运行契约的前提下补充业务聚合边界，降低定位和维护成本。

## What Changes

- 新增 `src/features` 业务功能根目录，按功能聚合 Blog、Admin、Application 和 Transport 相关代码。
- 完整迁移 Comment、Post、Media、Link、Menu、Page、Setting、Tag、User 和 Category 功能，保留 Next.js 路由薄入口。
- 统一业务功能内部的 `application`、`transport`、`admin`、`public` 目录职责。
- 保留 `domain`、`identity`、`infrastructure`、`ui` 等稳定技术基础层，不改变其依赖方向。
- 增加业务聚合边界测试，阻止新的功能代码继续跨功能散落。
- 保持 URL、tRPC procedure、输入输出、权限、数据库和用户交互行为不变。

## Capabilities

### New Capabilities

- `feature-oriented-organization`: 以业务功能聚合路由、用例、传输和界面代码，同时保持技术基础层稳定。

### Modified Capabilities

无。此次变更只调整代码组织和依赖入口，不改变对外业务需求。

## Impact

- 影响 `src/app`、`src/packages/application`、`src/packages/trpc/api/modules` 中全部后台业务域及其测试。
- 增加 `src/features` 下的全部业务功能目录及跨功能 `contracts`。
- 删除已无调用方的旧业务入口，不增加运行时依赖。
- 需要更新 TypeScript、Vitest、边界测试和 OpenSpec 任务。
