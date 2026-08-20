## 1. 建立单服务 DDD 模块骨架

- [x] 1.1 为 post、comment、user 增加 domain、模块根部仓储协议和 transport 目录。
- [x] 1.2 增加模块跨层、跨 feature 依赖边界测试。
- [x] 1.3 定义领域错误、聚合标识和值对象基础类型。

## 2. 领域化全部业务模块

- [x] 2.1 建立 Comment 聚合、审核状态行为和领域错误。
- [x] 2.2 建立 Post 聚合、草稿/发布/撤回行为和领域错误。
- [x] 2.3 建立 User 聚合、账号状态和高权限保护行为。
- [x] 2.4 为三个聚合增加 fake repository、状态机和等价性测试。
- [x] 2.5 将 category 收敛为 service、repository、infrastructure、transport。
- [x] 2.6 将 link 收敛为 service、repository、infrastructure、transport。
- [x] 2.7 将 media 收敛为 service、repository、infrastructure、transport。
- [x] 2.8 将 menu 收敛为 service、repository、infrastructure、transport。
- [x] 2.9 将 page 收敛为 service、repository、infrastructure、transport。
- [x] 2.10 将 setting 收敛为 service、repository、infrastructure、transport。
- [x] 2.11 将 tag 收敛为 service、repository、infrastructure、transport。
- [x] 2.12 完成其余模块的 fake repository 和契约测试。

## 3. 迁移应用用例和基础设施

- [x] 3.1 普通模块统一合并为根部 service 用例，核心模块保留选择性 DDD service。
- [x] 3.2 将 Drizzle 类型映射限制在 infrastructure adapter。
- [x] 3.3 删除全部 feature application 对数据库模型和领域状态的直接依赖。
- [x] 3.4 保持 tRPC、Admin Action、公开页面输入输出契约不变。

## 4. 引入领域事件

- [x] 4.1 建立进程内领域事件总线和事件契约。
- [x] 4.2 接入文章发布、评论审核、用户状态变化事件。
- [x] 4.3 将缓存、通知和邮件迁移为事件处理器。
- [x] 4.4 增加事件处理器失败、重试和幂等测试。

## 5. 全量验证与收口

- [x] 5.1 运行类型检查、lint、全量单测、覆盖率和构建。
- [x] 5.2 通过 tRPC、Admin 和公开页面相关单元/组件回归测试；真实浏览器回归仍记录在 5.4。
- [x] 5.3 更新架构文档、模块契约和迁移说明。
- [ ] 5.4 Playwright 已在提升权限环境执行：24 项中 20 项通过；3 个 Admin 合同测试因缺少真实登录会话被重定向到 `/admin/login`，PWA 离线 fallback 1 项在导航阶段返回 `ERR_FAILED`，待补充 E2E 登录会话和离线导航修复后复跑。

## 6. 核心模块轻量化

- [x] 6.1 将 Post、Comment、User 收敛为 `entity/aggregate + service + repository + events` 普通模板。
- [x] 6.2 直接删除核心模块旧 application、contracts 目录和兼容出口，transport 统一使用模块根部 service。
- [x] 6.3 删除核心模块中仅做类型转发的 interfaces 目录，并将仓储协议收敛到模块根部。
- [x] 6.4 为三模块补充轻量模板边界测试，确保 transport 不直接承载核心业务规则。
- [x] 6.5 重新运行全量类型检查、单测、Lint 和构建。
- [x] 6.6 将简单 CRUD 模块的 command/query/repository 协议合并为 service/repository 最小模板。
- [x] 6.7 删除简单 CRUD 模块无业务不变量的 domain 样板和空入口文件。
