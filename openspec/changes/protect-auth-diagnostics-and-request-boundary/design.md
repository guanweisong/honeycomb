## 背景

Better Auth 1.7.12 的默认 logger 将错误参数直接交给 console；会话读取失败可包含 Drizzle SQL、绑定和 cause。现有公共日志清洗不覆盖该 SDK 默认入口。Next 16.4.2 的运行时预渲染可以解析 `headers()`，但 `connection()` 等待真实请求；后台登录和 dashboard 共享 `app/admin/lib/admin-auth.ts`，不是通用身份库的职责。

## 目标与非目标

目标是保留可定位的认证日志级别、固定操作与白名单分类，同时阻止 SDK 输出原始数据；证明并阻止运行时预渲染进入后台会话读取。非目标是改变认证结果、全局关闭日志、吞掉数据库错误、修改 Upstash、撤销会话、添加新依赖或声称日志证明了用户可见故障。

## 决策与替代方案

1. 使用 Better Auth 现有 logger 配置接入共享安全 Logger，只输出固定 `operation` 与有限 `diagnosticCode`；保留 SDK 默认 warn 阈值。只对有限 cause 深度内的精确已知 code/digest 分类，其余归为 unknown。拒绝自由文本或递归错误序列化；不依赖正则碰巧匹配凭据，不采用全局日志关闭。
2. 先用实际 Next 请求存储和运行时预渲染存储验证已传入 headers 仍会进入后台认证，再在实际 app 请求所有者等待 `connection()`。不向 lib/db 或 feature 认证操作引入 Next，不修改登录 UI 或整个应用的渲染策略。
3. 使用合成错误和 SDK logger 验证泄漏边界；请求边界测试不接触数据库或生产服务。保留会话/用户校验抛错和 React 请求内去重测试。

## 风险与取舍

- 原始诊断文本被丢弃 → 只保留已审查分类和操作，未知故障仍有日志，不用用户名、token 或 SQL 获得可观测性。
- logger 参数含循环或抛错 getter → 有界检查且仅隔离日志失败，不改变业务异常。
- Next 内部测试 API 随版本变化 → 测试使用当前锁定版本的真实对象与 API，生产仅依赖公开 `connection()`。
- 无浏览器或发布证据 → 本轮报告定向验证；精确提交的浏览器、构建及发布验收由协调者单独记录。

## 实施与回退

先新增失败回归，实施独立日志适配器及已证明的 app 屏障，再运行定向测试、类型、lint、规格和独立评审。回退只涉及本变更的配置、适配器和 app 屏障；不触及数据或会话。

## 已验证证据与限制

- 只读生产诊断确认 `/admin/dashboard` 与 `/admin/login` 的 Better Auth → Drizzle/libsql → fetch 失败含 `HANGING_PROMISE_REJECTION`；精确 app 请求所有者来自部署 SHA `d8bf3f20` 的源码追踪，而非未混淆的生产栈。未证明用户可见 500 或 token 被使用。
- 本地真实 Better Auth `createLogger` 回归先 2 失败 / 4 通过；接入后日志定向测试 12 通过，原始 console 被测试拦截，不保留敏感生产内容。
- 已安装 Next 的真实请求存储 / 运行时预渲染存储回归先 2 失败 / 3 通过：两个路由已能读取 headers，却立即进入认证和 DB。app 所有者等待 `connection()` 后，预渲染中无认证/DB 调用，实际请求结果及异常保持；React RSC 的请求内去重用既有独立回归继续验证。
- 定向测试没有启动生产服务、数据库或浏览器；仍需协调者的聚合门禁与独立评审，不能据此声称生产事件已经消失。
