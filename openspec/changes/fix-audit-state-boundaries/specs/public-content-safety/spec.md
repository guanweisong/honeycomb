## ADDED Requirements

### Requirement: 公开页面媒体使用运行时白名单

页面公开列表和详情 MUST 在运行时将嵌套媒体转换为既有 MediaRecordSchema 公开字段集合，不得把完整数据库行或仅经静态类型注解的对象直接传给调用方。授权、发布状态和正文引用范围 MUST 保持现有约束。

#### Scenario: 匿名读取含内部媒体字段的页面
- **WHEN** 已发布页面正文引用的媒体记录包含非空 uploadKey、uploadedBy、uploadExpiresAt、copyStartedAt、verifiedAt、lastAttemptAt、lastErrorCode 或 state
- **THEN** 匿名 page.index 与 page.detail 实际序列化的嵌套媒体 MUST 仅含公开白名单字段，内部字段不得出现，公开媒体显示字段保持可用

#### Scenario: 数据库媒体行增加额外字段
- **WHEN** 底层媒体记录存在公开读模型未声明的额外属性
- **THEN** 页面公开输出 MUST 默认剔除该属性，不得依赖字段黑名单逐个补漏
