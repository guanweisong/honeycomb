## ADDED Requirements

### Requirement: 被排除的 Service Worker 必须有双层行为证据
覆盖率排除 `src/app/sw.ts` 时，系统 MUST 同时以生成清单测试证明 fallback 资源存在，并以生产模式浏览器 E2E 证明真实失败导航能够使用该 fallback。

#### Scenario: Service Worker 配置发生回归
- **WHEN** fallback URL 未进入生成 precache 或离线浏览器导航失败
- **THEN** 对应生成测试或 CI E2E 失败，不能仅凭源码字符串检查维持覆盖率排除

### Requirement: 新增测试必须优先覆盖高价值行为
工程 SHALL 优先覆盖登录校验、Admin 授权与 mutation 结果、PWA 和运行时边界，并 MUST NOT 为纯布局或无分支页面组合代码降低可读性以追求覆盖率数字。

#### Scenario: 选择待补充测试
- **WHEN** 覆盖率报告同时包含未测试业务交互和未测试纯组合页面
- **THEN** 本变更优先为前者增加可观察行为断言，并保持现有全局门槛不降低
