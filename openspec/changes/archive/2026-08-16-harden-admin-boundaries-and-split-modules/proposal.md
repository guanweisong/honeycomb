## Why

当前 Admin 用户读取入口直接依赖数据库基础设施，导致路由层绕过 Identity/Application 边界。与此同时，权限静态矩阵和若干业务页面承担了过多职责，增加了审查、测试和后续变更的成本。本次在不改变外部行为的前提下收紧边界并拆分职责。

## What Changes

- 将 Admin 当前用户查询迁移到 Identity/Application 可复用用例，保留现有 `getAdminUser` 调用契约。
- 为新的数据访问边界补充架构与行为测试。
- 拆分 capability 授权矩阵的数据、扫描工具和测试执行职责，保持权限结果不变。
- 拆分评估中识别出的大型业务页面和复杂设置组件中的明确职责，保持 UI、路由和数据行为不变。
- 将“行为保持不变、优先最小化重构、不顺手修改 API/UI/权限/数据模型”的原则写入 `frontend-structure` 技能。

## Capabilities

### New Capabilities

- `admin-identity-boundary`: Admin 当前用户查询通过 Identity/Application 用例访问。
- `module-responsibility-splitting`: 大型模块按职责拆分并保留稳定导出。

### Modified Capabilities

无。此次不改变对外需求或权限规则，仅调整内部边界和文件职责。

## Impact

- 影响 `src/app/admin/lib/admin-auth.ts`、`src/packages/identity`、`src/packages/application`、`src/packages/trpc/api` 及部分 Admin 页面模块。
- 影响包边界测试、相关单元测试和覆盖率配置，但不新增运行时依赖。
- 更新 `.codex/skills/frontend-structure/SKILL.md`，作为后续前端架构重构的默认约束。
