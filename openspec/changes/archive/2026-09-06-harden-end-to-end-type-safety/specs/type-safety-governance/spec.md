## ADDED Requirements

### Requirement: 同一语义契约必须具有唯一事实源

系统 SHALL 让同一读取模型的运行时 schema 与静态类型共享定义；contracts 仅重新导出所属 Feature 的模型，不独立重建。不同语义模型 SHALL 明确命名。

#### Scenario: 复用媒体与标签读取模型
- **WHEN** 文章、页面或缓存需要完整媒体/标签数据
- **THEN** 通过所属模块公开 Application 契约复用，不重新手写完整字段集合

#### Scenario: 区分评论响应
- **WHEN** 消费者引用公开或后台评论模型
- **THEN** 使用明确不同的名称，不出现同名但含义不同的 CommentViewModel

#### Scenario: 写入契约及配置目录复用
- **WHEN** 写入校验、OAuth 提供商、登录事件、分页参数、语言或缓存 namespace 被多个消费者使用
- **THEN** 同语义定义由所属模块提供，静态类型推导、传输出口重新导出，消费者不得平行维护完整字段或成员清单

#### Scenario: 保留边界默认值与转换语义
- **WHEN** 收敛 API、Repository、UI 的分页策略或评论记录映射
- **THEN** API 默认 updatedAt、Repository 默认 createdAt、UI 每页 20 条保持不变；评论读写及通知复用统一记录映射，同时保留各自关联和公开字段边界

### Requirement: 索引访问必须显式处理缺失

工程 SHALL 对生产代码、脚本和测试启用 noUncheckedIndexedAccess，不得通过非空断言或排除文件规避检查。

#### Scenario: 读取数组或开放字典
- **WHEN** 索引可能不存在
- **THEN** 消费者必须处理 undefined 或通过运行时检查建立存在保证

### Requirement: 持久化边界必须兑现返回契约

Repository SHALL 在返回领域枚举前验证持久化值，并对必需写入结果建立运行时存在保证。

#### Scenario: 写入未返回记录
- **WHEN** 创建或更新未返回契约要求的记录
- **THEN** 操作必须明确失败，不得返回伪装为对象的 undefined

#### Scenario: 存储了未知枚举
- **WHEN** 数据库读取包含不受支持的状态或类型
- **THEN** adapter 必须拒绝该值，不得使用类型断言把它传入领域对象

### Requirement: 外部与表单数据须经真实契约验证

系统 SHALL 从运行时验证后的数据构建提交和跨层模型，不得用业务对象断言或任意目标泛型掩盖不匹配。

#### Scenario: 外部返回畸形 JSON
- **WHEN** 验证接口或缓存返回不符合约定的数据
- **THEN** 系统必须拒绝或按明确的未命中策略处理，不得作为可信 DTO 使用

## MODIFIED Requirements

### Requirement: 类型清理不得改变外部行为

系统 MUST 保持现有 tRPC procedure、有效 Zod 输入协议、成功响应结构、数据库 schema 和迁移不变。非法持久化数据和必需写入结果缺失 MUST 明确失败。

#### Scenario: 完成类型安全治理
- **WHEN** 所有清理任务完成
- **THEN** 类型检查、Lint、全量单元测试、覆盖率门禁和生产构建必须通过
