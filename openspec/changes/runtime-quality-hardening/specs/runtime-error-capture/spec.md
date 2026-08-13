## ADDED Requirements

### Requirement: App Router 错误边界安全恢复
系统 MUST 为公共站点、后台和根布局提供 App Router 错误边界；错误边界 SHALL 与既有 instrumentation 记录协同工作，且 MUST NOT 向用户暴露内部异常详情。

#### Scenario: 客户端路由边界捕获异常
- **WHEN** 公共站点或后台的客户端路由段渲染失败
- **THEN** 系统展示安全恢复界面，允许用户重试，且服务端错误记录保持既有请求关联信息

#### Scenario: 根错误边界捕获异常
- **WHEN** 普通路由错误边界无法恢复根布局异常
- **THEN** 系统展示全局安全错误界面且不显示原始异常文本
