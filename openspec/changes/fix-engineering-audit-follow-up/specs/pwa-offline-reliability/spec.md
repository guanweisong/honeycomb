## ADDED Requirements

### Requirement: 跨源运行时缓存限定公开资源范围

Service Worker MUST 仅为明确允许的公开资源设置跨源缓存，导航文档以实际请求模式区分。

#### Scenario: 页面发起普通第三方请求

- **WHEN** 请求目标不属于允许的公开资源范围
- **THEN** Worker 不为它建立跨源运行时缓存条目
