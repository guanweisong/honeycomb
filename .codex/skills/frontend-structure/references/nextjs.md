# Next.js 与前端约束

- 本工程使用当前安装版本的 Next.js；写代码前阅读 `node_modules/next/dist/docs/` 中相关指南，遵循本仓库生成的 Next.js agent rules。
- 使用 App Router，不新增 Pages Router。服务端默认优先；只有交互、浏览器 API 或客户端状态才使用 Client Component。
- `@/*` 用于源码绝对导入，`@tests/*` 用于测试；避免深层相对路径。Server-only 代码保持服务端边界，禁止被客户端 bundle 引入。
- Provider 放在最靠近实际消费者的位置；不要把局部状态升级为全局状态。服务端数据、URL 状态、表单状态和 UI 瞬时状态分别放在合适边界。
- UI 优先复用已有组件和设计系统；样式遵循仓库既有方案，不为局部需求引入新依赖或重复造组件。
- tRPC、TanStack Query 和缓存的使用遵循现有包边界；新增依赖前检查 package、版本和现有能力。
- 路由只做页面组合和边界适配；业务流程进入 Use Case，持久化进入 Repository。
- Feature 之间禁止通过深层路径互相引用；使用公开入口、稳定契约或 Application 边界。
