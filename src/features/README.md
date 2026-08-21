# 业务功能边界

`src/features` 是业务代码的唯一归属边界，降低开发者在页面、用例和传输层之间定位代码的成本。

每个 feature 使用以下入口：

- `application/*-use-cases.ts`：业务用例编排
- `repository.ts`：最小持久化端口
- `infrastructure/`：Drizzle、存储和外部服务适配器
- `schemas/`：该 feature 的输入校验和传输类型
- `*.router.ts`：tRPC 传输入口
- `domain/`：仅用于确有不变量的复杂模块
- `admin`：后台功能
- `public`：Blog 或公共功能

`src/packages/trpc` 只负责 tRPC 核心、上下文、客户端绑定和共享传输工具，不再承载业务
feature 的 schema 或 router。Feature 之间禁止直接依赖内部文件；跨功能复用应通过
稳定的 public 能力或明确的共享契约完成。
