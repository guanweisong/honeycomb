## 1. 权限矩阵基线

- [x] 1.1 在 `add-observability-foundation` 完成后枚举全部受保护 tRPC procedure 及当前允许角色
- [x] 1.2 建立逐 procedure 的旧角色矩阵测试，锁定迁移前允许和拒绝行为
- [x] 1.3 根据实际业务动作定义完整 Permission 集合，避免路由名和无使用场景的权限

## 2. Capability 核心

- [x] 2.1 实现穷尽的 `ROLE_PERMISSIONS`、`can`、unknown role 默认拒绝和 ADMIN 全权限规则
- [x] 2.2 为 ADMIN、EDITOR、GUEST 建立完整能力快照和新增 Permission 遗漏测试
- [x] 2.3 实现 `permissionProcedure` 和显式 all/any 的 `permissionsProcedure`
- [x] 2.4 接入 capability 拒绝结构化日志与 API outcome 指标，且不记录用户隐私

## 3. Router 一步迁移

- [x] 3.1 迁移 post、page、category、tag 和 menu Router 的全部受保护 procedure
- [x] 3.2 迁移 comment、media、link、setting、statistic 和 user Router 的全部受保护 procedure
- [x] 3.3 逐 procedure 运行允许/拒绝矩阵，确认 handler 在授权失败时不执行
- [x] 3.4 删除旧 `protectedProcedure([roles])` 实现及全部调用，不保留 wrapper、feature flag 或双轨逻辑
- [x] 3.5 增加静态门禁，保证后续代码不能恢复角色数组授权

## 4. 管理后台能力可见性

- [x] 4.1 提供不依赖服务端秘密的共享 Permission、角色映射和前端 `can` 工具
- [x] 4.2 将管理后台导航可见性从直接角色判断迁移为 capability 判断
- [x] 4.3 将创建、编辑、删除、审核、上传和设置按钮迁移为 capability 判断
- [x] 4.4 增加前端可见性与服务端角色能力矩阵一致性测试

## 5. 安全验证与文档

- [x] 5.1 覆盖未登录、禁用用户、未知角色、缺少能力、all/any 复合能力场景
- [x] 5.2 运行类型检查、Lint、全量单测、生产构建和管理后台 E2E
- [x] 5.3 静态扫描确认仓库中不存在业务 `UserLevel` 比较授权和角色数组 procedure 授权
- [x] 5.4 更新 README 和权限矩阵文档，说明角色仅映射能力且服务端是最终边界
