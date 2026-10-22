## MODIFIED Requirements

### Requirement: 跨层 DTO 必须表达稳定字段

系统 MUST 由所属 feature 拥有稳定输入输出模型，并显式描述业务所需字段；纯契约不得依赖 tRPC procedure output、服务端实现或 ORM 运行时，server 实现可以直接使用 ORM 类型。数据库类型引用只允许 model-boundary-governance 中经审计的 LinkRecord 正向白名单例外，不扩展为目录级许可。

#### Scenario: server 实现持久化读取

- **WHEN** server 函数读写持久化模型
- **THEN** 函数必须在需要裁剪、规范化或转换的持久化边界显式构造稳定结果，不创建无职责 mapper

#### Scenario: Transport 调用 Feature server 操作

- **WHEN** tRPC、Server Action 或其他 Transport 入口调用 Feature server 操作
- **THEN** 输入契约必须直接复用所属 feature 的权威 schema，不依赖 router 实现或 procedure output

## ADDED Requirements

### Requirement: 同语义派生保持契约边界

系统 MUST 优先从已有 schema、纯契约、SDK 或运行时目录推导同语义类型；MUST 保留输入输出、optional/nullable、合法枚举字符串及服务端默认策略差异。独立测试 oracle、隐私投影和真实独立技术端口 MUST NOT 为减少声明而合并。

#### Scenario: 可选查询字段派生

- **WHEN** 手写可选字段改为 schema 输出派生
- **THEN** 在 exactOptionalPropertyTypes 开关两种模式下保持原允许的显式 undefined 语义，并以独立预期验证，不改变运行时解析和分页默认

#### Scenario: 内部用户邮箱过滤

- **WHEN** UserListInput 派生公开查询的共同字段
- **THEN** email 继续作为内部显式扩展，公开 schema 不新增该字段
