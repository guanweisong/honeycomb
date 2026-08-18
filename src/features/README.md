# 业务功能边界

`src/features` 按业务功能聚合代码，降低开发者在页面、用例和传输层之间定位代码的成本。

每个 feature 使用以下入口：

- `application`：业务用例和规则
- `transport`：tRPC schema、Router 和传输适配
- `admin`：后台功能
- `public`：Blog 或公共功能

`src/packages` 仍然负责稳定的技术基础能力。Feature 之间禁止直接依赖内部文件；跨功能复用应通过 Domain、UI 或明确的公共契约完成。
