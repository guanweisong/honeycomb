## ADDED Requirements

### Requirement: 门禁必须识别替代命名的边界违规
架构门禁 MUST 按契约职责识别 Feature 根目录的 Repository 和业务端口，不得只禁止名为 `repository.ts` 的单一文件名。

#### Scenario: 根目录新增 ports 文件
- **WHEN** Feature 根目录新增 `ports.ts`、`*-port.ts` 或声明业务 Repository 端口的生产文件
- **THEN** 架构测试失败并报告具体 Feature 和文件

### Requirement: 门禁必须阻止已淘汰运行时资产与死抽象
架构门禁 SHALL 拒绝重新引入旧 Service Worker/Workbox 公共资产，以及没有生产消费者的通用事件基础设施。

#### Scenario: 重新提交遗留 PWA 文件
- **WHEN** `public` 出现 `sw.js`、对应 source map 或 `workbox-*`
- **THEN** 质量门禁失败并指向应使用的 Serwist 入口

#### Scenario: 重新新增未接线事件总线
- **WHEN** 生产源码新增通用事件总线但没有生产创建、注册和消费路径
- **THEN** 架构审查与门禁拒绝该无职责抽象
