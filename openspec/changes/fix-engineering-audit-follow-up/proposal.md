## 背景

工程审查在认证、内容读取、浏览器恢复与发布验证边界复现了问题。修复范围为禁用账号的 Cookie 与完整报告的 P2、P3。

## 变更

- 禁用账号原子撤销会话，处理历史会话、认证事务、审计分类及受信代理输入。
- 修复评论通知、媒体就绪、内容和分类查询及浏览器编辑、列表、导航和 PWA 行为。
- 收敛重复投影、解析、脚本加载和 CI 准备，校验真实迁移顺序并更新 Next.js 安全补丁。

## 能力

- 更新 `better-authentication`、`side-effect-consistency`、`post-edit-consistency`、`page-edit-consistency`、`public-web-experience`、`pwa-offline-reliability`、`api-security-boundaries` 和 `database-migration-governance` 的相关行为契约。

## 非目标

- 演示账号权限、菜单的草稿可见性和读快照、tRPC 批量限流及认证原始异常日志属于其他优先项，留待独立处理。
- 无部署、线上迁移或外部邮件发送。

## 影响

Better Auth、业务读写、后台编辑与公开路由、PWA、迁移门禁、测试环境、CI 及 Next.js 锁文件。
