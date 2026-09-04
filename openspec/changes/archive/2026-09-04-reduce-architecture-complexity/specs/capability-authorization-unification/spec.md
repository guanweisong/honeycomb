## ADDED Requirements

### Requirement: Capability registry 是权限定义的唯一事实来源
系统 MUST 通过 capability registry 定义能力、所需权限和资源范围；页面、菜单、procedure、action 和 route MUST 调用统一授权服务，不得复制角色判断。

#### Scenario: 新增受保护入口
- **WHEN** 新增 procedure、Admin Action 或受保护页面
- **THEN** 它 MUST 注册并引用已有或新建 capability，缺失登记时架构测试 MUST 失败

#### Scenario: 多入口授权结果
- **WHEN** 同一主体通过不同入口访问同一能力
- **THEN** 所有入口 MUST 使用相同授权策略并返回一致的允许或拒绝结果

### Requirement: 客户端权限状态不能替代服务端授权
客户端组件 MAY 展示权限相关 UI，但服务端 MUST 在执行 use case 前完成最终授权。

#### Scenario: 恶意绕过客户端按钮
- **WHEN** 客户端隐藏按钮后仍构造请求调用受保护操作
- **THEN** 服务端 MUST 拒绝未授权请求，且不得依赖客户端状态
