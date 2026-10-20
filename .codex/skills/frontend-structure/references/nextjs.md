# Next.js 与前端约束

- 本工程使用当前安装版本的 Next.js；写代码前阅读 `node_modules/next/dist/docs/` 中相关指南，遵循本仓库生成的 Next.js agent rules。
- 使用 App Router，不新增 Pages Router。服务端默认优先；只有交互、浏览器 API 或客户端状态才使用 Client Component。
- `@/*` 用于源码绝对导入，`@tests/*` 用于测试；避免深层相对路径。Server-only 代码保持服务端边界，禁止被客户端 bundle 引入。
- Provider 放在最靠近实际消费者的位置；不要把局部状态升级为全局状态。服务端数据、URL 状态、表单状态和 UI 瞬时状态分别放在合适边界。
- UI 优先复用已有组件和设计系统；样式遵循仓库既有方案，不为局部需求引入新依赖或重复造组件。
- tRPC、TanStack Query 和缓存的使用遵循现有运行时与 feature 边界；新增依赖前检查 package、版本和现有能力。
- 路由只做页面组合和边界适配；业务流程及持久化进入所属 feature 的 server 函数。
- Feature 可直接复用其他 feature 有意提供的纯契约、具名 UI 或 server 操作入口；禁止 router 耦合、反向 app 依赖及浏览器/纯模块的运行时泄漏，不要求 public 转发层。
