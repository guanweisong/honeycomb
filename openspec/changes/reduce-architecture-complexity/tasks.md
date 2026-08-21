## 1. 建立目标架构与基线

- [x] 1.1 盘点所有 feature 的入口、依赖、数据模型和权限消费者，生成迁移基线报告
- [x] 1.2 定义 feature 职责边界、允许依赖方向和按需目录命名规则，并补充架构文档
- [x] 1.3 编写依赖方向、Server/Client 边界和 feature 内部访问规则的架构测试
- [x] 1.4 建立文件规模、入口数量、跨 feature 依赖和第三方依赖的复杂度预算检查

## 2. 建立模型边界与用例基础设施

- [x] 2.1 定义 Persistence Model、Domain Model、View Model 的类型归属和转换约定
- [x] 2.2 建立 feature-owned mapper 约定，禁止 UI 和 domain 直接依赖 Drizzle 类型或通用 tRPC output
- [x] 2.3 建立 Application Use Case 的输入、输出、授权、事务和错误语义约定，并保留简单查询直达 Query/Repository 的规则
- [x] 2.4 增加检测业务 router、action 和页面直接执行数据库操作或领域编排的测试

## 3. 迁移核心领域模块

- [x] 3.1 将 Post 的发布、审核、版本和状态转换迁移到统一 domain/application 结构
- [x] 3.2 将 Comment 的审核、隐藏、回复和通知副作用迁移到统一 domain/application 结构
- [x] 3.3 将 User 的账号状态、权限相关不变量和登录历史用例迁移到统一 domain/application 结构
- [x] 3.4 为三个核心模块补充 use case、聚合、repository contract 和领域事件行为测试
- [x] 3.5 将 tRPC、Admin Action 和公开入口改为调用核心模块 use case

## 4. 迁移轻量 CRUD 模块

- [x] 4.1 为 Category、Link、Media、Menu、Page、Setting、Tag 定义统一轻量 use case/repository 模板
- [x] 4.2 迁移上述模块的查询、命令、数据库 adapter 和 tRPC transport
- [x] 4.3 将 Admin、Blog 和共享媒体 UI 改为使用 feature View Model
- [x] 4.4 删除迁移完成后不再承担职责的根部 service、重复 wrapper 和旧 adapter
- [x] 4.5 为每个迁移模块补充入口一致性、数据转换和边界回归测试

## 5. 统一权限授权

- [x] 5.1 设计并实现统一 `authorize(capability, context)` 服务及窄接口
- [x] 5.2 将 procedure、Admin Action、Admin route 和菜单权限接入统一授权服务
- [x] 5.3 清理页面、hook、router 和 action 中重复的角色判断与权限推断
- [x] 5.4 增加 capability 登记完整性、多入口结果一致性和服务端强制授权测试

## 6. 收敛共享层与依赖

- [x] 6.1 审计 `packages/ui`、`features/contracts` 和所有 `shared` 目录的真实消费者与职责
- [x] 6.2 将仅单一消费者使用的共享代码下沉回所属 feature
- [x] 6.3 合并重复 UI、查询工具、数据转换和基础设施适配器
- [x] 6.4 清理未使用、重复或边界不清晰的第三方依赖，并更新依赖审计规则
- [x] 6.5 删除无独立职责的纯转发层，保持公共导出路径的迁移兼容性直至调用方完成迁移

## 7. 质量门禁与文档收尾

- [x] 7.1 将架构测试、模型泄漏检查、复杂度预算和依赖审计纳入本地及 CI 质量流程
- [x] 7.2 更新架构依赖报告、DDD 迁移指南、权限矩阵和测试说明
- [ ] 7.3 执行类型检查、Lint、全量单元测试、覆盖率、生产构建和 E2E
- [x] 7.4 复核所有迁移兼容入口，确认无调用方后删除旧结构
- [x] 7.5 记录最终复杂度指标，与迁移前基线对比并归档变更
