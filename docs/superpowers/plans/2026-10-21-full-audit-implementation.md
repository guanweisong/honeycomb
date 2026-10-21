# 全仓审查实施计划

> 历史范围：本文保留 52daeb59 基线的 74 项实施计划、当时任务状态与验证，不是当前提交清单。后续复审处置与精确提交验收见[本轮实施记录](../../skill-reaudit-implementation.md)；文中的取消 100 项删除上限仅指分类，其他资源仍有各自批量合同。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 逐项处理74项审查结论，修复确认缺陷，验证优化并保留所有行为护栏。

**Architecture:** 沿现有Feature和共享基础设施边界小步修改，不增加通用CRUD/状态层。先修正确性，再做有证据的局部写法优化，最后复核与CI。

**Tech Stack:** Next.js 16.4、React 19.3、TypeScript、tRPC、Drizzle/libSQL、Vitest、Playwright。

**Spec:** docs/full-audit-implementation-ledger.json（冻结审查52daeb59；74项完整路径和处理状态）。

## Global Constraints

- 不访问生产数据库、读取/轮换凭据、执行迁移、部署或合并PR。
- 保留双语quote/fallback、历史日期范围、无媒体显示、平铺导航、无100删除上限。
- 保留版本写入、事务鉴权、发布过滤、未知结果核对与缓存顺序。
- 未验证的性能收益不宣称；已确认的两项产品语义：待审核文章可按现有权限保存/发布，不新增退回草稿；自定义目标评论邮件使用通用标题、保留正文、不附目标链接。

## Review Focus

- 同一ID关闭重开弹窗后旧提交回包不能关闭新会话。
- 评论等待期间编辑新草稿，旧结果不能清除新输入。
- 非空白但规范化后弱secret必须拒绝，不能碰真实配置。
- 列表窄DTO保留删除版本、双语和quote字段，详情仍完整。
- 网络/存储失败保留可恢复状态，不把已提交与同步失败混为一谈。

## 身份、评论与功能状态

范围：FEAT-001, FEAT-002, FEAT-004, FEAT-007, FEAT-003, FEAT-005, FEAT-006, FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014, FEAT-015, FEAT-016, FEAT-008, FEAT-009

- [x] 逐项核对真实调用链；行为缺陷先写反例确认 RED，文档和测量项使用相应证据。
- [x] 完成最小实现及定向 GREEN，记录实际命令、结果和测量/浏览器限制。
- [x] 完成分区复核和必要修正，保留行为护栏并更新逐项账本。

## 基础设施与测试

范围：INFRA-001, INFRA-002, INFRA-004, INFRA-005, INFRA-006, INFRA-007, INFRA-008, INFRA-009, INFRA-011, INFRA-012, INFRA-003, INFRA-010

- [x] 逐项核对真实调用链；行为缺陷先写反例确认 RED，文档和测量项使用相应证据。
- [x] 完成最小实现及定向 GREEN，记录实际命令、结果和测量/浏览器限制。
- [x] 完成分区复核和必要修正，保留行为护栏并更新逐项账本。

## 路由与组件写法

范围：FE-001, FE-002, FE-003, FE-004, FE-009, FE-010, FE-011, FE-005, FE-006, FE-007, FE-008, FE-012, FE-013, FE-014, FE-015

- [x] 逐项核对真实调用链；行为缺陷先写反例确认 RED，文档和测量项使用相应证据。
- [x] 完成最小实现及定向 GREEN，记录实际命令、结果和测量/浏览器限制。
- [x] 完成分区复核和必要修正，保留行为护栏并更新逐项账本。

## 分类、媒体、菜单、页面与标签

范围：CONTENT-004, CONTENT-005, CONTENT-007, CONTENT-009, CONTENT-010, CONTENT-014, CONTENT-001, CONTENT-003, CONTENT-006, CONTENT-008, CONTENT-011, CONTENT-012, CONTENT-013, CONTENT-002

- [x] 逐项核对真实调用链；行为缺陷先写反例确认 RED，文档和测量项使用相应证据。
- [x] 完成最小实现及定向 GREEN，记录实际命令、结果和测量/浏览器限制。
- [x] 完成分区复核和必要修正，保留行为护栏并更新逐项账本。

## 文章列表与编辑器

范围：CONTENT-POST-001, CONTENT-POST-003, CONTENT-POST-004, POST-B-001, POST-B-002, POST-B-003, POST-B-004, CONTENT-POST-002, POST-B-005

- [x] 逐项核对真实调用链；行为缺陷先写反例确认 RED，文档和测量项使用相应证据。
- [x] 完成最小实现及定向 GREEN，记录实际命令、结果和测量/浏览器限制。
- [x] 完成分区复核和必要修正，保留行为护栏并更新逐项账本。

## 工具、配置与现行规格

范围：ROOT-001, ROOT-002, SPEC-01, SPEC-02, SPEC-03, ROOT-004, ROOT-005, SPEC-04

- [x] 逐项核对真实调用链；行为缺陷先写反例确认 RED，文档和测量项使用相应证据。
- [x] 完成最小实现及定向 GREEN，记录实际命令、结果和测量/浏览器限制。
- [x] 完成分区复核和必要修正，保留行为护栏并更新逐项账本。

## 集成与发布

- [x] 全部 74 项已逐项对账，无遗漏/重复：69 项实施，4 项测试加强，1 项测量改进但真实浏览器基线待验证。
- [x] 串行类型、Lint、定向测试、规格与 diff 检查已执行；新增类型错误修正，剩余 Sentry 缺依赖诊断已明示，完整验收交由精确提交 CI。
- [ ] 审查后的相容提交更新现有PR17，验证远端SHA和对应CI终态，不合并。

## First exact-head CI correction

- Run 39586834677 at 3c603634 failed after types, lint and build passed: 9 unit and 2 development-browser failures. It is not an accepted final result.
- Align stale menu endpoint, post query/sort and scroll-hook fixtures with the implemented interfaces; retain assertions and permission mutation coverage.
- Enable Node 22.14 TypeScript stripping explicitly for real timezone subprocesses.
- Move TypeScript-project ESLint contracts into the existing required serial process lane, without changing assertions or their 30s deadlines. Two fixtures now give cold TypeScript-project initialization a distinct 60s beforeAll setup deadline (an explicit setup timeout change, based on observed 32–50s starts). Negative fixtures are still evaluated after initialization. Production coverage scope and thresholds remain unchanged.
- Use documented version-2 performance measurements rather than subtract counters across documents or dilute active work with an artificial wait. See [measurement definitions](../../performance-smoke-measurements.md). Active-performance baselines remain pending.
- Re-publish a reviewed correction and require its own complete GitHub quality run.
