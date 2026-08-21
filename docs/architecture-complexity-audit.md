# 复杂度治理收尾审计

## 共享层

`features/media/shared` 同时被媒体管理页、AdminProviders 和 Post 编辑器使用，保留为共享模块；其 UI 已使用 `MediaViewModel`，不直接依赖 tRPC output。未发现只有单一消费者而必须下沉的共享业务模块。

## 兼容入口

业务 feature 根部的旧 `service.ts` 和 `<feature>.service.ts` 已删除，生产代码和测试均改用 `application/*-use-cases.ts`。架构测试会阻止旧入口重新出现。

## 第三方依赖

本次审计确认主要直接依赖都有生产代码引用：Next/React/Zod/Drizzle/date-fns、图表、动画、编辑器、媒体和认证相关依赖均存在实际消费者。未自动删除依赖，避免把动态导入、构建插件和类型依赖误判为未使用。

## 结论

共享层当前没有可安全下沉的单一消费者模块；重复 UI/适配器没有发现足以支持删除的确定性重复实现。后续新增依赖 MUST 提供消费者和边界说明，新增共享模块 MUST 提供至少两个真实消费者及边界测试。

## 收尾指标

| 指标 | 迁移前基线 | 当前结果 |
| --- | ---: | ---: |
| `src` 文件数 | 679 | 691 |
| `src` TypeScript/TSX 行数 | 约 46,080 | 46,588 |
| 业务 feature 数 | 10 | 11（含 contracts 目录） |
| 测试文件数 | 208 | 215 |
| 生产文件超过 600 行 | 0 | 0 |
| feature 根部旧 service 文件 | 存在 | 0 |

类型检查、Lint、全量单元测试、覆盖率和 webpack 生产构建均通过。覆盖率为：Statements 81.34%、Branches 75.23%、Functions 77.70%、Lines 82.26%。E2E 尚未完成：安全测试环境无法启动独立本地服务，且已有开发服务器占用端口；未终止用户进程或加载真实凭据。
