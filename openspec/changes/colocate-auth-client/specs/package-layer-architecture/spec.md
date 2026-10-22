## ADDED Requirements

### Requirement: 浏览器认证绑定归属技术库

共享 Better Auth 浏览器客户端 MUST 位于 src/lib/auth/client.ts，保留 use client 指令、现有插件顺序和单实例。MUST NOT 保留 src/auth-client.ts 兼容转出口，也不得为此次迁移移动 src/auth.ts 或 Next.js 根入口。

#### Scenario: 检查客户端认证入口

- **WHEN** 运行目录和浏览器依赖门禁
- **THEN** 新文件 MUST 存在、旧文件 MUST 不存在，且新文件 MUST 纳入既有直接及间接客户端依赖检查
