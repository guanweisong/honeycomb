## Purpose

明确业务写操作、多步骤协调和外部副作用的 Application Use Case 边界及 Repository 归属规则，同时允许简单只读查询保持轻量，避免产生无职责的转发层。
## Requirements
### Requirement: 业务操作必须经过 Application Use Case

任何改变持久化状态、触发与业务结果相关的缓存、通知、对象存储、验证码或其他外部副作用，或需要多个步骤协调的行为 MUST 由 feature-owned Application Use Case 承载；简单查询 MAY 由 Server Query/Repository 直接提供。tRPC、Server Action、Route Handler 和页面只能负责输入校验、入口鉴权、依赖组装、调用与结果映射，不得直接执行上述业务副作用；可缓存 Server Component MUST NOT 在渲染阶段调用写操作。API 限流、会话解析和传输错误协议 SHALL 保留在传输边界。

#### Scenario: tRPC 调用业务写操作

- **WHEN** procedure 接收合法输入
- **THEN** 它 MUST 调用对应 Use Case，并不得直接编排领域规则、数据库写入或与写入结果相关的外部副作用

#### Scenario: 多种入口调用同一业务操作

- **WHEN** tRPC 和 Server Action 提供相同业务能力
- **THEN** 两者 MUST 调用同一个 Use Case，且缓存与外部服务副作用的顺序和失败语义 MUST 一致

#### Scenario: 简单查询

- **WHEN** 查询只读取数据，且不包含写入、副作用或跨步骤业务协调
- **THEN** Server Component 或 Query MAY 直接调用 Query/Repository，不得因此创建空的 Use Case 或 Domain 层

#### Scenario: 静态内容页面记录浏览量

- **WHEN** 可缓存 Server Component 渲染文章或页面详情
- **THEN** 它 MUST NOT 调用浏览量写操作，计数由独立请求承担

#### Scenario: 传输入口保护

- **WHEN** API 请求需要限流、会话解析、入口 capability 鉴权或协议错误映射
- **THEN** transport SHALL 在调用 Use Case 前完成这些职责，且不得把 HTTP 或 tRPC 类型传入 Application

#### Scenario: 第三方身份路由不得提供竞争写入口

- **WHEN** 后台用户资料写入需要 capability 鉴权并触发公开缓存失效
- **THEN** transport MUST 禁用绕过该 Application Use Case 的通用身份资料更新端点

#### Scenario: 评论请求元数据进入用例

- **WHEN** HTTP transport 接收公开评论创建请求
- **THEN** transport MUST 将请求头转换为只包含 IP 与 User-Agent 的纯数据后传入 Application，Application 和 Repository 契约不得接收 `Headers` 或其他 HTTP 类型

#### Scenario: 评论目标业务规则

- **WHEN** 创建评论或读取公开评论需要检查目标可见性、评论开关或父评论目标
- **THEN** Infrastructure MUST 只返回持久化状态，Application MUST 判断公开状态、是否允许评论及父子同源规则

#### Scenario: Application 转出口

- **WHEN** transport 从 Feature Application 入口导入用例
- **THEN** Application 入口 MUST NOT 直接或通过 Feature 根目录转出口导出 Infrastructure DTO、Repository 实现或外部服务 adapter

### Requirement: Repository 接口默认归属 Application

业务 Use Case MUST 依赖位于 Application 的 Repository 接口，Infrastructure MUST 提供具体实现；Domain MUST NOT 访问 Repository。

#### Scenario: Repository 实现替换

- **WHEN** 持久化实现或测试 fake 发生替换
- **THEN** Use Case 的业务代码 MUST 不需要依赖或修改 Infrastructure 实现细节

### Requirement: 纯转发层不得作为业务抽象保留

没有独立校验、授权、事务、转换、缓存或副作用职责的 wrapper MUST NOT 继续作为独立业务层存在。

#### Scenario: 仅转发参数的 service

- **WHEN** service 仅原样调用另一个函数并返回结果
- **THEN** 迁移检查 MUST 将其标记为可删除，并要求调用方改用实际职责所在的入口

### Requirement: Application 必须真实拥有业务端口
Feature 的 Repository、Credential、Login History 及其他业务用例端口 MUST 定义在该 Feature 的 `application` 目录；Feature 根目录 MUST NOT 通过改名或重新导出继续拥有同一契约。

#### Scenario: User 用例引用持久化端口
- **WHEN** User Application、Infrastructure 或 Presentation 使用用户读写、凭据或登录历史契约
- **THEN** 它从 User Application 的权威定义导入，且根目录不存在 `ports.ts`、`*-port.ts` 或兼容出口

### Requirement: 无生产消费者的事件编排不得保留
工程 MUST NOT 保留只被测试使用、没有生产创建或注册入口的事件总线、事件注册器、pending event 队列或可选事件总线参数。

#### Scenario: 状态转换完成持久化
- **WHEN** Post、Page、Comment 或 User Use Case 完成受领域不变量保护的状态转换
- **THEN** 它直接返回持久化结果，不生成随后被静默丢弃的进程内事件
