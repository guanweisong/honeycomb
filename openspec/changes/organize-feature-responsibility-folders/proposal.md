## 为什么

Feature 根目录中的 types.ts、schema.ts、server.ts 混合了多个职责，枚举又分散在业务和 UI 文件。按职责建立具体入口，让消费者能够直接找到权威定义，同时延续上一轮 schema 与派生类型分离。

## 变更内容

- 迁移现有类型到所属 feature 的 types/，按职责命名；所有 TypeScript 枚举一枚举一文件，包括展示枚举。
- 迁移根 schema/server 到具名目录文件，保留已经合理拆分的实现，不建立 barrel、空目录或重复字段定义。
- 同步真实消费者、mock、架构门禁和工程说明，保留全部现有导出符号及运行时语义。

## 能力

### 新增能力

无。

### 修改能力

- feature-module-contract：约束具体职责入口及一枚举一文件，同时保持运行时依赖边界。
- type-safety-governance：区分 types/ 内纯类型模块与枚举/catalog 值模块，继续由 schema 推导业务类型。
- architecture-complexity-governance：权威 schema 使用具名文件而非固定 schema.ts，禁止旧平铺出口和兼容转发层。

## 影响

涉及全部 11 个 feature 及 app、lib、scripts、测试中的实际消费者。不改 URL、tRPC procedure、权限、数据库结构、输入输出、事务、缓存和副作用失败语义；不提交、推送、创建 PR 或部署。dashboard 不新增无用途的 types/schema。
