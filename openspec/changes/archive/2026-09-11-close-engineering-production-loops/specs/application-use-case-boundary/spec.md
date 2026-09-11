## ADDED Requirements

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
