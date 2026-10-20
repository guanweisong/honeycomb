## Purpose

明确业务写入、多步骤协调和外部副作用由 feature server 函数负责，同时允许直接数据库访问，删除没有独立职责的 Repository、factory、Use Case 与 handler 跳转。

## Requirements

### Requirement: 业务操作由 Feature server 函数负责

改变持久化状态或协调业务副作用的行为 MUST 由 feature-owned server 函数表达。函数 MAY 直接使用 Drizzle、数据库和技术适配器；tRPC、Server Action、Route Handler 与页面 MUST 保持输入、会话、入口 capability、限流和协议适配职责，不复制业务流程。可缓存 Server Component MUST NOT 在渲染阶段写入。

#### Scenario: tRPC 调用业务写操作

- **WHEN** procedure 接收合法且已获入口授权的输入
- **THEN** 它 MUST 调用对应 feature 的实际 server 操作，不在 handler 中重复状态转换、数据库写入或相关副作用

#### Scenario: 多种入口调用同一业务操作

- **WHEN** tRPC 和 Server Action 提供相同业务能力
- **THEN** 两者 MUST 复用同一 server 函数，保持授权相关不变量、事务及副作用失败语义一致

#### Scenario: 简单查询

- **WHEN** 查询只需读取数据
- **THEN** Server Component 或 router MAY 直接调用实际 server 读取函数，不创建空的 Use Case 或 Repository 包装

#### Scenario: 静态内容页面记录浏览量

- **WHEN** 可缓存 Server Component 渲染详情
- **THEN** 它 MUST NOT 执行浏览量写入，计数由独立请求承担

#### Scenario: 传输入口保护

- **WHEN** API 请求需要限流、会话、入口 capability 或协议错误映射
- **THEN** 入口 MUST 在业务操作前完成保护，不将 HTTP 或 tRPC 请求对象作为业务数据传递

#### Scenario: 第三方身份路由不得提供竞争写入口

- **WHEN** 后台用户资料写入要求 capability 和公开缓存失效
- **THEN** 通用身份资料更新端点 MUST 保持禁用，不得绕过 User server 操作

#### Scenario: 评论请求元数据进入业务操作

- **WHEN** HTTP 入口接收公开评论创建请求
- **THEN** 它 MUST 提取普通 ip/userAgent 元数据，业务函数不得把 Headers 作为业务输入

#### Scenario: 评论目标业务规则

- **WHEN** 评论创建或公开读取检查目标
- **THEN** server 操作 MUST 在持久化或返回前验证公开状态、评论开关及父子同源规则

### Requirement: 服务端操作允许直接数据库访问

feature server 函数 SHALL 使用实际需要的数据库和技术依赖，不要求 Repository 接口、依赖工厂或独立用例层。持久化校验、事务、显式映射和条件写入 MUST 保留；稳定输入及输出契约 MUST NOT 泄漏数据库连接或 ORM 查询对象。

#### Scenario: 测试直接数据库操作

- **WHEN** 测试 feature server 函数
- **THEN** 测试 SHALL 使用真实函数签名的 typed mock、fixture 或隔离本地数据库，而不是为测试增加生产接口层

#### Scenario: 并发分类更新

- **WHEN** 两个分类父节点更新可能形成环
- **THEN** SQL 写入条件 MUST 保留防环保护，不能只依赖查询后的前置判断

### Requirement: 纯转发层不得作为业务抽象保留

没有独立校验、授权、事务、转换、缓存或副作用职责的 wrapper MUST NOT 继续作为独立业务层存在。

#### Scenario: 仅转发参数的入口

- **WHEN** service、Use Case、handler 或 factory 只转发参数并返回另一函数结果
- **THEN** 调用方 MUST 改用实际职责所在的函数，并删除无职责入口

### Requirement: 无生产消费者的事件编排不得保留

工程 MUST NOT 保留只被测试使用、没有生产创建或注册入口的事件总线、注册器、pending event 队列或可选事件总线参数。

#### Scenario: 状态转换完成持久化

- **WHEN** Post、Page、Comment 或 User 操作完成受业务不变量保护的状态转换
- **THEN** 它 SHALL 直接返回持久化结果，不生成随后被静默丢弃的进程内事件

### Requirement: 所有 Feature 写入传输入口必须调用实际服务端操作

所有 feature tRPC mutation MUST 调用本 feature 承担该操作的可执行 server 函数；门禁 MUST 动态发现全部 feature，不依赖固定名单或旧 service 文件名。

#### Scenario: 新增 Feature mutation

- **WHEN** 新 feature 新增 mutation
- **THEN** 架构测试 MUST 自动检查该 mutation 是否接入所属 feature 的 server 操作

#### Scenario: mutation 绕过业务操作

- **WHEN** mutation handler 直接执行状态变更而不调用该 feature 的 server 操作
- **THEN** 架构测试 MUST 失败并定位 router 和 handler
