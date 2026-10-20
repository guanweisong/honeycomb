# 复杂度治理收尾审计

> 历史记录：本文的旧目录、规范、计数和验证仅适用于当时版本，不作为当前架构要求或本轮验证结果。2026-10-20 起当前指导见[架构与依赖边界](architecture-dependency-report.md)及[代码阅读地图](code-reading-map.md)。

> 本文保留 2026-09-06 的审计结论和测量；以下“本次”“当前”均指当时版本，不构成后续架构指令。

## 共享层

`features/media/shared` 同时被媒体管理页、AdminProviders 和 Post 编辑器使用，保留为共享模块；其 UI 已使用 `MediaViewModel`，不直接依赖 tRPC output。未发现只有单一消费者而必须下沉的共享业务模块。

## 兼容入口

当时删除了 feature 根部的旧 `service.ts` 和 `<feature>.service.ts`，并迁入当时的用例目录。该历史落点现已废止；当前直接 server 函数路径以代码阅读地图为准。

## 第三方依赖

本次审计确认主要直接依赖都有生产代码引用：Next/React/Zod/Drizzle/date-fns、图表、动画、编辑器、媒体和认证相关依赖均存在实际消费者。未自动删除依赖，避免把动态导入、构建插件和类型依赖误判为未使用。

## 结论

当时审计未找到可安全下沉的单一消费者共享模块，也未发现足以支持删除的确定性重复 UI/适配器。此结论仅适用于当时扫描范围；当前共享能力与业务所有权应按现行架构重新核对。

## 收尾指标

| 指标                                 |  2026-09-06 当前结果 |
| ------------------------------------ | -------------------: |
| `src` 文件数                         |                  740 |
| `src` TypeScript/TSX 文件数          |                  724 |
| `src` TypeScript/TSX 行数            |               50,570 |
| feature 目录数                       | 11（含 `contracts`） |
| 测试文件数                           |                  275 |
| 生产文件超过 600 行                  |                    0 |
| feature 根部旧 service/port 文件     |                    0 |
| 无生产消费者的领域事件基础设施       |                    0 |
| 遗留根级 Service Worker/Workbox 资产 |                    0 |

类型检查、Lint、迁移治理、全量单元测试、覆盖率、进程级门禁和 Webpack 生产构建均通过。全量单测为 252 个测试文件、1140 项测试；覆盖率为 Statements 82.03%、Branches 74.66%、Functions 80.25%、Lines 83.09%。安全响应头、RBAC 与 PWA 关键 Chromium E2E 为 6/6 通过，PWA 生产离线用例另连续运行两次通过。

默认 Turbopack 构建与 `next experimental-analyze` 在当前受限执行环境中均停在 PostCSS 子进程创建阶段，错误为内部端口绑定 `Operation not permitted`；相同隔离假配置下 Webpack 生产构建通过，失败发生在数据库访问前。该限制已记录，不以失败结果冒充分析通过。
