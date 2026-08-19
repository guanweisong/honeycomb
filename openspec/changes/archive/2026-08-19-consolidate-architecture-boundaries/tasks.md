## 1. 建立边界治理基础

- [x] 1.1 增加 feature application 禁止导入数据库实现的 TypeScript AST 测试，并先确认当前代码按预期失败。
- [x] 1.2 增加 capability registry 的类型、完整性和重复声明测试。
- [x] 1.3 将现有 tRPC capability 矩阵和 Admin action guard 矩阵改为引用 registry，保留现有 procedure 和权限语义。
- [x] 1.4 运行治理测试，确认未知 capability、遗漏入口和 application 数据库依赖均能被阻断。

## 2. 迁移媒体、标签和用户

- [x] 2.1 为 media 定义业务持久化端口和 Drizzle adapter，迁移 application 查询与命令。
- [x] 2.2 为 tag 定义业务持久化端口和 Drizzle adapter，迁移 application 查询与命令。
- [x] 2.3 为 user 定义业务持久化端口和 Drizzle adapter，迁移 application 查询、命令和管理用例。
- [x] 2.4 为上述三个 feature 增加 fake port 测试和 adapter 行为测试。
- [x] 2.5 运行 media、tag、user 相关单测、类型检查和边界测试。

## 3. 迁移内容与管理业务

- [x] 3.1 迁移 comment、post、page 的 application 数据访问到业务端口。
- [x] 3.2 迁移 menu、link、category、setting 的 application 数据访问到业务端口。
- [x] 3.3 迁移通知、统计、关系查询等特殊用例，保留事务、缓存和观测行为。
- [x] 3.4 删除 application 中对数据库连接、schema、query helper 和 ORM 的直接导入。
- [x] 3.5 运行所有 feature 的相关测试并修复端口契约差异。

## 4. 统一所有授权入口

- [x] 4.1 为 tRPC procedure、Admin Action、Admin route 和菜单入口补充稳定 capability 标识。
- [x] 4.2 将权限矩阵测试改为从 registry 生成预期集合，不再维护第二套权限事实源。
- [x] 4.3 增加静态检查，拒绝未注册 capability、重复入口绑定和受保护入口遗漏绑定。
- [x] 4.4 保留并验证现有 ADMIN、EDITOR、GUEST 权限结果及 UNAUTHORIZED/FORBIDDEN 错误语义。

## 5. 全量验证和文档收尾

- [x] 5.1 更新架构依赖报告、README 和测试说明，明确 feature application/infrastructure 边界。
- [x] 5.2 运行 `bun run check-types`。
- [x] 5.3 运行 `bun run lint`。
- [x] 5.4 运行 `bun run test:unit:run`、`bun run test:unit:coverage` 和 `bun run test:unit:process`。
- [x] 5.5 运行 `bun run build` 并检查路由、tRPC procedure 和客户端边界未变化。
- [x] 5.6 在可用数据库环境中运行 Playwright 回归；若环境不可用，记录阻塞原因，不放宽边界测试。

> Playwright 已运行 24 项，20 项通过。其余 4 项因当前环境未提供可登录的后台测试账号/数据库状态，以及浏览器 service worker 在本地回归环境中未完成注册而失败；未放宽架构边界或修改业务断言。

## 归档后补充验证

- [x] 增加 Admin route capability 登记表和后台页面覆盖测试。
- [x] 将 Admin Action capability 引用统一为 `Permission.*`。
- [x] 增加 media、tag、user Drizzle adapter 行为测试。
- [x] 修正静态 Admin Action 检查对 `Permission.*` 引用的解析。
