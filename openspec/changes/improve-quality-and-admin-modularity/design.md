## Context

Vitest 当前只覆盖测试运行时导入的模块，82% 报告不能代表全部生产源码，也没有 thresholds 阻止回退。UI 方面，DataTable 同时管理状态、选择、表头、表体和分页；menu、user、link、media、page edit、comment 页面介于 250 至 340 行，并混合查询、mutation、列定义、对话框和呈现。

## Goals / Non-Goals

**Goals:**

- 建立真实、稳定并能阻止回退的覆盖率口径。
- 为安全和基础设施核心设置更高门槛。
- 将 DataTable 与六个高变更管理页面拆成清晰模块。
- 保持 URL、API、视觉和交互行为不变。
- 使抽取的状态与纯转换逻辑可直接测试。

**Non-Goals:**

- 不重新设计管理后台 UI。
- 不改变 tRPC 契约、数据库 Schema 或业务权限。
- 不以任意行数作为唯一拆分标准。
- 不要求 shadcn 基础组件逐个达到业务覆盖率。

## Decisions

### 1. 覆盖全部生产源文件并维护理由化排除

coverage include 显式指向 `src/**/*.{ts,tsx}`。排除声明、纯类型、生成文件、shadcn 基础组件和必须由 E2E 验证的薄入口；每项排除以注释或集中清单说明原因。不得排除业务页面、hooks、services、权限、环境配置和观测核心来满足门槛。

### 2. 分层门槛渐进落地

全局初始 thresholds 为 statements/lines 70、functions 65、branches 60。权限、环境变量、脱敏、sitemap、缓存和观测核心使用 statements/lines 90、branches 80。若启用完整口径后低于目标，先补关键测试再启用门禁，不降低已批准目标。

### 3. DataTable 保持 facade API

现有 `DataTable` 继续作为公开组合入口，消费者无需同步重写。内部拆为 `useDataTableState`、`useRowSelection`、Header、Body、Toolbar、Pagination 和 types。TanStack Table 实例仍由组合入口持有，避免状态分布到多个不透明组件。

### 4. 管理页按 feature 垂直拆分

每页保留轻量 page shell；查询 hook、action hook、columns、dialogs、表单及纯转换函数位于页面 feature 目录。共享抽象只有在至少两个 feature 存在稳定相同行为时才上移，避免制造新的万能组件。

### 5. 逐页迁移并锁定行为

迁移顺序为 DataTable、menu、user、link、media、page edit、comment。每个阶段运行针对性单测和相关 Playwright；全部完成后运行全量质量门禁。

## Risks / Trade-offs

- [完整覆盖率口径导致数值大幅下降] → 将真实缺口作为补测输入，不回退到“仅已导入模块”口径。
- [拆分产生 prop drilling] → 使用 feature hook 和小型 typed context，仅在确有共享状态时引入。
- [过度抽象降低可读性] → page-specific 模块保持就近，只有稳定重复行为进入 shared UI。
- [大型重构引入交互回归] → 保持 facade API、逐页迁移并使用现有 E2E 锁定行为。

## Migration Plan

1. 调整覆盖率 include/exclude，生成真实基线并补关键模块测试。
2. 启用全局和关键模块 thresholds。
3. 拆分 DataTable，保持公开 API 并增加状态/选择测试。
4. 按顺序拆分六个管理页面，每页单独验证。
5. 运行类型、Lint、单测覆盖率、生产构建和完整管理端 E2E。

每个页面重构可独立回滚；覆盖率门禁只能随对应测试一起回滚，不能单独关闭来掩盖失败。

## Open Questions

无。UI 重新设计和 Server Component 化不包含在本 change。
