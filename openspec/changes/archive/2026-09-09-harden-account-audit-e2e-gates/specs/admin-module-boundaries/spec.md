## ADDED Requirements

### Requirement: CI 必须执行完整且确定性的 Chromium E2E 库存

质量工作流 MUST 在显式隔离的本地数据库迁移并播种最小确定性数据后运行完整 Chromium Playwright 项目，MUST NOT 通过点名 spec 文件缩小既有测试库存。关键场景 MUST NOT 因缺少运行时内容而条件跳过。

#### Scenario: 新增 E2E spec 自动进入质量门禁

- **WHEN** 开发者在 E2E 目录新增由 Chromium 项目匹配的 spec
- **THEN** CI 的完整项目命令 MUST 自动执行该文件，无需修改工作流文件列表

#### Scenario: 空白 CI 数据库获得确定性场景数据

- **WHEN** 质量工作流创建新的本地 SQLite/libSQL 数据库
- **THEN** 系统 MUST 在启动浏览器测试前创建可登录后台账号以及主题、菜单、文章、页面、分类和标签所需的最小数据

#### Scenario: 阻止种子脚本写入远程数据库

- **WHEN** 种子脚本收到非本地 `file:` 数据库 URL或缺少显式 E2E 开关
- **THEN** 脚本 MUST 在任何写入前终止

#### Scenario: 确定性浏览器契约不可跳过

- **WHEN** 主题切换或标签导航所需的数据意外缺失
- **THEN** E2E MUST 失败并暴露夹具回归，而不是调用条件跳过
