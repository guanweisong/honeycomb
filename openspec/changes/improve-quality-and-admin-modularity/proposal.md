## Why

当前覆盖率报告主要统计测试实际导入的模块，不能代表全部生产源码，且没有门槛阻止质量回退；同时 DataTable 和多个管理页面承担过多状态、请求与呈现职责。需要调整质量口径并拆分高变更模块，在保持现有行为的前提下降低维护成本。

## What Changes

- 显式纳入生产 TypeScript/TSX 源码统计覆盖率，定义有理由的排除项和分层覆盖率门槛。
- 为权限、环境变量、脱敏、sitemap、缓存与观测核心设置更高的关键模块门槛。
- 将 DataTable 拆分为状态、选择、表头、表体、工具栏和分页等职责独立模块，同时保持公开调用接口。
- 依次拆分 menu、user、link、media、page edit 和 comment 等大型管理页面。
- 将查询、mutation、列定义、对话框、表单转换和页面组合职责分离。
- 保持现有 URL、tRPC 契约、视觉效果和交互流程，通过单测及 Playwright 回归验证。

## Capabilities

### New Capabilities

- `coverage-governance`: 规定生产源码覆盖率统计口径、全局门槛和关键模块门槛。
- `admin-module-boundaries`: 规定 DataTable 和大型管理页面的职责边界及行为兼容要求。

### Modified Capabilities

- `module-boundaries`: 将现有模块职责隔离要求扩展到 DataTable 与高变更管理页面。

## Impact

- 影响 `vitest.config.ts`、测试布局、DataTable 及六个优先管理功能页面。
- 不改变外部 API、路由、数据模型和 UI 设计。
- 完整覆盖率口径可能首先暴露现有测试缺口，任务必须通过补测达到门槛，不得排除业务模块规避。
- 本 change 在前三个基础与权限 change 完成后执行，避免重构期间同时改变安全语义。
