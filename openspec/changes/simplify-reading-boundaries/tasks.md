# 实施计划

> 后续架构说明：本变更记录先前阅读路径整理。其 packages、application/domain/infrastructure、中央 contracts 及共享 UI 所有权约定已由 simplify-feature-architecture 取代；既有行为与安全约束继续保留。此处的旧验证结果不是新迁移的验证证据，未完成发布任务也不构成本轮发布授权。

执行方式：在 master 的独立 worktree 和 refactor/readability-boundaries 分支实施；可并行处理互不重叠的选项迁移及命令简化，集成后由独立审查者复核。无直接合并或生产操作。

## 1. 基线与回归保护

- [x] 核对基线 master 316b7b2、干净工作树、仓库规范和既有测试；依赖版本不变。
- [x] 为纯数据 contracts、无展示导出的 domain、无空文章命令入口和无 app 反向依赖编写边界测试，先运行确认新约束在旧实现下失败。
- [x] 用独立字面量期望记录各 UI 选项的值、中文名称、顺序，不从实现反算预期。

## 2. 简化实际阅读路径

- [x] 合并 post 的 use-cases 空入口和命令处理编排；保留聚合、仓储、状态分支、错误和缓存失效顺序；迁移并运行现有命令与 router 测试。
- [x] 合并 user 的单用途状态处理器；保留查询错误映射及 public 用途出口，运行用户状态、权限和命令测试。
- [x] 删除 category/link/page/post/tag/user 的纯别名 presentation 文件；contracts 直接导出已有权威模型。CategoryListItem 复用 CategoryRecord 并保留 deepPath，所有消费者类型不变。
- [x] 按既有概念将 UI 名称和选项迁入 packages/ui/admin 下具名文件，调整全部导入与测试；枚举和规则不迁移。
- [x] 将 CurrentUserProvider、useCurrentUser 和 useCan 迁至 packages/ui/admin/use-current-user.ts，同步真实消费者和 mock 路径，保留查询选项与权限行为。
- [x] 评论 UI 使用所属 feature 的公开结果契约，不再依赖 app 查询函数类型；运行评论 DTO 与公开组件测试。

## 3. 文档与防回退

- [x] 添加短阅读地图，给出文章写入、公开读取、当前用户三个实际入口；README 链接，并修正与本轮冲突的旧目录说明。
- [x] 同步架构检查的目标路径；不删除权限、领域、仓储、公开 DTO 或 server-only 边界门禁。扫描旧引用及重复定义。

## 4. 验证和交付

- [x] 运行规格校验、git diff --check、类型检查和 lint。
- [x] 运行完整单元测试/覆盖率、进程测试、生产构建；任何数据库测试仅使用独占临时本地 file: 数据库及显式假配置，结束验证清理。
- [x] 独立审查 diff，重点核对状态转换、错误传播、异步执行顺序、敏感数据裁剪、选项顺序和依赖方向；修复范围内问题后重跑受影响门禁。
- [ ] 按仓库约定提交英文 Conventional Commit，推送新分支，创建独立 PR；跟踪原有完整 CI 和自动预发至终态，分别报告已验证内容和环境限制，不合并。
