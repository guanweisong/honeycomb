## ADDED Requirements

### Requirement: 生产依赖必须具有生产消费者

直接运行时依赖 MUST 被生产运行时代码或生产构建配置实际消费。仅测试使用的包 MUST 位于开发依赖；无运行时消费者且仅用于空转 mock 的包及 mock MUST 删除。

#### Scenario: 依赖仅出现在测试 mock

- **WHEN** 某包没有生产代码消费者，且测试只为未触发的边界声明 mock
- **THEN** 工程 MUST 删除该无效 mock 和生产依赖，并确保认证或其他运行时行为保持不变。

#### Scenario: CSS 或框架 peer 依赖

- **WHEN** 依赖通过 CSS 指令或框架声明的 peer 关系被实际加载
- **THEN** 依赖审查 MUST 将其识别为真实消费者，不得仅因没有 TypeScript import 而删除。
