## ADDED Requirements

### Requirement: 设置写入契约必须区分真实语义

Setting 所属 Application MUST 拥有后台更新运行时 schema 和内部 nullable patch schema，静态类型 MUST 从对应 schema 推导，transport MUST 仅重新导出其消费的权威 schema。

#### Scenario: 后台更新设置
- **WHEN** 后台表单或 tRPC 更新 Setting
- **THEN** 输入 MUST 使用 Application 拥有的后台更新 schema，transport 不得重写字段清单

#### Scenario: 内部清空本地化字段
- **WHEN** 内部用例需要把某个本地化 Setting 字段整体设为 `null`
- **THEN** 它 MUST 使用明确命名的内部 patch 契约，不得扩大后台表单协议

### Requirement: 菜单契约不得使用开放索引签名

Menu 保存输入 MUST 从 Application 运行时 schema 推导，Menu 读取模型 MUST 只声明真实字段且不得包含 `[key: string]: unknown`。

#### Scenario: 拼错菜单读取字段
- **WHEN** 消费者访问 Menu 读取模型未声明的字段
- **THEN** TypeScript 类型检查 MUST 失败

### Requirement: 缓存失效端口必须保持唯一

所有 Feature MUST 通过 `PublicContentInvalidator.invalidate(plan)` 表达公开缓存影响，不得平行维护 `invalidateContent`、`invalidateAll` 或同义兼容端口。

#### Scenario: 评论失效公开缓存
- **WHEN** 评论创建、更新或删除影响公开内容
- **THEN** Comment Application MUST 构造权威计划并调用唯一 `invalidate(plan)` 端口

#### Scenario: 扫描兼容入口
- **WHEN** 唯一事实源门禁扫描生产代码
- **THEN** `invalidateContent` 与 `invalidateAll` 同义入口 MUST 不存在
