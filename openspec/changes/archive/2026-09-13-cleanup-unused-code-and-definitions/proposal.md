## Why

全工程审计发现若干没有消费者的出口文件、重复声明的直接依赖、未声明的测试依赖和少量可维护性较差的重复实现。这些残留会扩大依赖与公共 API 表面，并让 feature 公共边界和实际导入路径产生偏差。

## What Changes

- 删除确认没有消费者的 Domain、数据库 barrel 和历史类型声明，并移除对应无用依赖。
- 收敛 Radix UI 依赖到工程实际使用的聚合包，补齐测试直接使用的开发依赖，移除无效包入口配置。
- 让 Comment 与 Post 的公开消费者统一经过各自的 `public` 出口，避免跨 feature 深层导入。
- 收窄只供模块内部使用的导出，消除误导性的公共 API 表面和重复再导出链。
- 合并文章/页面浏览量跟踪的公共实现，以及列表页面渲染和 metadata 共用的筛选上下文与标题解析。
- 增加自动化回归检查，阻止已删除的无用出口、依赖和深层公共导入重新出现。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `dependency-supply-chain-hygiene`：依赖清单必须与真实直接消费者一致，并显式声明测试直接导入的开发依赖。
- `architecture-complexity-governance`：复杂度门禁需要阻止已确认的死出口和误导性 feature 公共入口回归。
- `feature-module-contract`：跨 feature 的 Comment/Post 公共 UI 消费必须使用显式 `public` 出口。

## Impact

- 影响 `package.json`、`bun.lock`、Comment/Post 公共出口、博客列表和浏览量组件，以及相关架构测试。
- 不改变 tRPC 协议、数据库 schema、持久化数据、路由 URL 或用户可见行为。
- 不清理框架约定入口、手工运维备份脚本、双 favicon、shadcn 基础组件完整导出面和收益不足的小型 UI 重复。
