## ADDED Requirements

### Requirement: Feature 职责使用具体目录入口

Feature MUST 将已有根 types.ts、schema.ts、server.ts 迁入按真实职责命名的 types/、schemas/、server/；MUST NOT 保留旧平铺入口、兼容 barrel 或为无实际需求的模块创建空目录。已有职责清晰的子目录文件 SHALL 保持其所有权，不为目录对称拆散事务。

#### Scenario: 枚举按所属模块单独定义

- **WHEN** feature 中存在 TypeScript enum，包括展示名称或组件对齐 enum
- **THEN** 每个枚举 MUST 位于所属 feature 的 types/ 独立文件中，一个文件仅一个 enum；展示枚举不得成为业务 schema、规则或持久化的依赖

#### Scenario: 迁移服务端实现

- **WHEN** 根 server.ts 拆入具名 server 文件
- **THEN** 数据库及副作用操作入口 MUST 保持 server-only，浏览器不得通过直接或间接导入加载服务端实现，纯转换 helper 不因目录名称变成公开客户端契约

#### Scenario: 无独立契约需求

- **WHEN** dashboard 等模块的返回值可由真实操作与 transport 推导
- **THEN** 系统 MUST NOT 为目录对称添加空 types/schemas 或无用途模型

#### Scenario: 服务端测试按被测职责就近组织

- **WHEN** 整理 Feature 根 server.test.ts 或 server.integration.test.ts
- **THEN** 测试 MUST 迁入所属 server/ 并跟随实际实现具名；单职责文件 SHALL 整体迁移，混合职责 MAY 拆分，跨操作完整事务/并发场景 MUST 保留在具名 integration 测试中；MUST NOT 保留笼统根入口、删减断言或重复昂贵 fixture，E2E SHALL 继续位于 tests/e2e
