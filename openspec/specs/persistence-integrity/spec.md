## Purpose

定义由领域权威目录派生的数据库不变量，使绕过 Application 的写入也不能保存非法状态、数值、评论目标或多条全局设置。

## Requirements

### Requirement: 数据库执行权威枚举约束

数据库 MUST 拒绝不属于领域权威目录的状态、类型和事件值，Application 与 Infrastructure MUST 从同一权威目录派生运行时校验和读取窄化。

#### Scenario: 写入非法状态
- **WHEN** 任意数据库写入尝试保存不受支持的内容、身份或导航状态/类型
- **THEN** 数据库 MUST 以约束错误拒绝该写入

#### Scenario: 读取合法状态
- **WHEN** Repository 从数据库读取状态或类型
- **THEN** adapter MUST 验证并返回对应领域类型，不得暴露普通 `string`

### Requirement: 数据库执行数值范围约束

数据库 MUST 拒绝负数浏览量、媒体大小、媒体宽度和媒体高度，并允许业务定义的零值与 nullable 尺寸。

#### Scenario: 写入负媒体大小
- **WHEN** 写入 `media.size < 0`
- **THEN** 数据库 MUST 拒绝该记录

#### Scenario: 写入空媒体尺寸
- **WHEN** 媒体宽度或高度为 `null`
- **THEN** 数据库 SHALL 接受该记录

### Requirement: 评论必须且只能关联一个目标

每条评论 MUST 在 `postId`、`pageId`、`customId` 中恰有一个非空目标，数据库约束和 Application schema MUST 表达同一规则。

#### Scenario: 评论没有目标
- **WHEN** 评论的三个目标字段全部为空
- **THEN** 数据库 MUST 拒绝该记录

#### Scenario: 评论具有多个目标
- **WHEN** 评论的两个或三个目标字段同时非空
- **THEN** 数据库 MUST 拒绝该记录

### Requirement: 网站设置保持单例

数据库 MUST 至多保存一条全局 Setting，Repository MUST 通过稳定单例键读取，且不得依赖无排序查询的首行。

#### Scenario: 创建第二条设置
- **WHEN** 数据库已存在全局 Setting 且再次创建另一条 Setting
- **THEN** 数据库 MUST 以唯一约束拒绝第二条记录

#### Scenario: 迁移发现多条设置
- **WHEN** 迁移前置审计发现目标数据库存在多条 Setting
- **THEN** 迁移 MUST 中止并报告数量，不得自动删除或选择记录

### Requirement: 严格约束迁移必须先审计既有数据

增加业务 CHECK 或单例唯一约束前，系统 MUST 提供只读预检；发现不兼容数据时 MUST 中止迁移且不得泄露敏感字段内容。

#### Scenario: 发现非法枚举
- **WHEN** 只读预检发现某表包含权威目录之外的枚举值
- **THEN** 预检 MUST 报告表、字段和数量，并阻止迁移
