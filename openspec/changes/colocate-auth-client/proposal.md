## 背景

Better Auth 浏览器客户端是跨登录、账户安全和后台退出复用的技术绑定，不需要占用 src 根目录。将它放回 lib/auth 可明确所有权，而不改变认证架构。

## 变更内容

- 将 src/auth-client.ts 逐字迁至 src/lib/auth/client.ts，同步消费者和 mock。
- 保留 use client、插件顺序、单实例以及 src/auth.ts 与 Next.js 根入口位置。
- 增加路径和现有浏览器依赖门禁，更新当前导航；历史报告不重写。

## 能力

### 新增能力

无。

### 修改能力

- package-layer-architecture：明确共享浏览器认证绑定与根服务端组合的不同归属。

## 影响

仅客户端技术入口、6 个生产消费者、8 个测试文件及治理配套；不修改认证插件、服务端 hook、权限、会话或业务逻辑。
