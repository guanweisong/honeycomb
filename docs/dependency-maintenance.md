# 依赖维护约定

本轮保持 Next/React、Node24、TypeScript6、ESLint9、Table8 与稳定 Drizzle 线不变；不通过预发布包、跨主版本 override 或新增安全豁免消除告警。

- 邮件模板直接从 `react-email` 获取组件与 render，继续由 Resend 发送。保留转义、正文/链接、内联样式、请求中止与失败传播；干净锁文件安装必须能解析 Resend 实际使用的 `@react-email/render`。
- 编辑器只注册一次 StarterKit 自带 Link，将原配置放在 `StarterKit.configure({ link: ... })`。Color 使用 text-style 导出，任务列表使用 extension-list；不改变持久化 HTML 和编辑命令。
- 生产直接导入的 `@tiptap/core` 显式声明。测试实际调用的 `@better-fetch/fetch`、`nanostores`、`esbuild` 放在 devDependencies，不依赖偶然提升的传递依赖。
- 统一使用 `tw-animate-css`；Sheet 保留固定 2.5rem 滑动距离，动画时长兼容旧级联值，不复制 enter/exit keyframes。减少动态效果与过渡时长由编译契约和浏览器回归验证。
- Cravatar 邮箱标识由服务端 `node:crypto` 生成 MD5；保留 trim/lowercase、UTF-8 和 hex 输出，不把该标识哈希描述为密码安全机制。
- Better Auth 使用独立 Drizzle adapter 和外部迁移，因此采用 `better-auth/minimal`，不引入内置数据库连接或迁移。包体积探针不等于线上性能收益；认证、passkey、权限及实际构建仍须验证。
- Bun 固定版本由 packageManager、README 和 CI 同步；Motion/AWS两包按兼容版本维护。官方 React Email 新包包含工具依赖，不能用直接依赖数量下降宣称安装或部署体积下降。

实时安全结论和开发链限制见[生产依赖审计例外](dependency-audit-exceptions.md)。验证范围和未验证项以本轮实际执行记录为准，历史 CI 不能代表当前修改树。
