## MODIFIED Requirements

### Requirement: 被排除的 Service Worker 必须有双层行为证据

覆盖率排除 `src/app/pwa/sw.ts` 时，系统 MUST 同时以生成清单测试证明 fallback 资源存在，并以生产模式浏览器 E2E 证明真实失败导航能够使用该 fallback。

#### Scenario: Service Worker 配置发生回归

- **WHEN** fallback URL 未进入生成 precache 或离线浏览器导航失败
- **THEN** 对应生成测试或 CI E2E 失败，不能仅凭源码字符串检查维持覆盖率排除
