## 1. 认证基础设施

- [x] 1.1 添加 Better Auth、Drizzle 适配器及相关客户端依赖，移除 NextAuth 依赖前先完成代码迁移所需的类型入口
- [x] 1.2 在 Drizzle schema 中增加 Better Auth 核心表、username 字段和必要关系，生成并审核数据库 migration
- [x] 1.3 编写幂等的现有密码账号迁移脚本，将 bcrypt 哈希写入 credential account
- [x] 1.4 增加认证基础设施测试，覆盖 schema 字段、密码迁移幂等性和无密码用户跳过

## 2. Better Auth 服务端

- [x] 2.1 先编写 Better Auth 配置行为测试，覆盖用户名登录、禁用用户、Turnstile、OAuth provider 配置和用户字段保护
- [x] 2.2 创建 Better Auth 服务端实例，配置 username、email/password、Google/GitHub/Apple 和数据库适配器
- [x] 2.3 接入 Turnstile 登录前置校验，并将现有业务用户状态和 OAuth 邮箱同步逻辑接入 Better Auth 生命周期
- [x] 2.4 将认证 Route Handler 从 `[...nextauth]` 切换为 `[...all]`，并补充 endpoint 集成测试

## 3. 应用层接入

- [x] 3.1 先更新 tRPC context 测试，再将服务端 session 读取替换为 Better Auth API，并保留数据库状态/等级复核
- [x] 3.2 新增 Better Auth React client，替换 Admin 根布局中的 NextAuth `SessionProvider`
- [x] 3.3 改造登录页的用户名密码登录、OAuth 登录和 provider 展示，保持 callback URL、Turnstile 和错误提示行为
- [x] 3.4 改造后台登出流程，清理认证状态、查询缓存并跳转登录页
- [x] 3.5 更新类型扩展、环境变量解析、README 和认证相关测试 mock，移除 NextAuth 引用

## 4. 验证与上线准备

- [x] 4.1 运行认证单元测试和全量单元测试，修复回归
- [ ] 4.2 运行类型检查、lint 和 Next.js production build
- [ ] 4.3 运行 OpenNext Cloudflare build，确认 Turso/libSQL 运行时兼容性
- [x] 4.4 检查 migration 可重复执行、OAuth 回调地址和重新登录发布说明
