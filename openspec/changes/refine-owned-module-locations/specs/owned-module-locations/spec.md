## ADDED Requirements

### Requirement: 后台共享职责就近组织

共享后台状态工具 MUST 归 admin/lib，查询选项 MUST 归 admin/config，三个 UI 枚举 MUST 各自位于 admin/types 的独立文件；草稿 hook、提示 UI 和完整测试 MUST 就近归 draft。共享消费者 MUST 不反向依赖 app，不得增加兼容 barrel 或改动草稿/显示行为。

#### Scenario: 迁移后台共享消费者

- **WHEN** 业务页面引用状态、选项、枚举或本地草稿
- **THEN** MUST 使用真实职责入口，原枚举值、JSX、存储时序、断言和完整场景 MUST 保持

### Requirement: 入口策略与通用技术能力分离

后台 query client MUST 归 app/admin/lib，认证事件适配 MUST 归 app/auth；评论专属限制 MUST 由 comment 显式配置 5/min、原 prefix 及 fallbackLimit=5。通用 Redis 工厂、API 120/min、750ms 和生产 fail-closed MUST 留在 lib 且保持原语义。

#### Scenario: 评论限流失败

- **WHEN** provider 拒绝或不可用
- **THEN** MUST 在 handler 前保持原拒绝/不可用错误，fallback 限额 MUST 为 5，不得退化为通用 120

### Requirement: 删除无独立职责出口保留原证据

通知查询 MUST 直接使用 Drizzle getTableColumns，不保留 selectAllColumns 纯转发壳。getClientIp MUST 只从 HTTP 模块提供，旧测试的双 header 优先级和首 IP 空白断言 MUST 保留；迁移不得减少测试矩阵、重复昂贵 fixture 或放松覆盖率门槛。

#### Scenario: 验证结构迁移

- **WHEN** 交付归属整理
- **THEN** MUST 给出路径与声明/测试等价证据、完整非 E2E 和构建结果，真实浏览器 E2E 未运行 MUST 明示
