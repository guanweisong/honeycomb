## 1. 领域契约与请求元数据

- [x] 1.1 新增用户领域契约并让原 tRPC 用户类型文件兼容 re-export。
- [x] 1.2 将 DB、Auth 和权限模块切换到领域契约，验证底层不再导入 tRPC 用户模块。
- [x] 1.3 新增无副作用的客户端 IP 解析模块，并让 middleware、rate-limit 与登录历史统一使用。

## 2. Auth 服务端边界

- [x] 2.1 拆分 OAuth provider 共享定义与服务端环境配置。
- [x] 2.2 抽取登录历史 repository/query 和失败登录用户解析服务。
- [x] 2.3 抽取 Better Auth 请求审计 handler，并将 catch-all Route Handler 缩减为委托层。
- [x] 2.4 抽取 Better Auth database hooks，保持用户名生成、禁用用户拦截和登录成功审计行为。
- [x] 2.5 将登录历史 Route Handler 改为调用仅查询当前用户的服务。

## 3. UI 依赖反转

- [x] 3.1 为 Tiptap 定义媒体选择器接口和注入机制。
- [x] 3.2 在后台 App layout 注入现有 PhotoPicker，并移除 UI 对 App 与 tRPC 媒体类型的导入。
- [x] 3.3 补充图片、视频媒体选择流程和无注入场景测试。

## 4. 边界与回归验证

- [x] 4.1 新增源码依赖边界测试，约束 DB/Auth 不依赖 tRPC、UI 不依赖 App。
- [x] 4.2 运行相关单元测试、账号安全测试、类型检查、Lint、OpenSpec 严格校验和生产构建。

## 5. I18n 领域契约与边界测试

- [x] 5.1 先将包边界测试改为 AST 解析 import declaration，确认现有 DB 到 tRPC 的多行 I18n 导入被检测并失败。
- [x] 5.2 新增 Domain I18n 契约与测试，保持 trim、非空和 nullable 解析行为。
- [x] 5.3 让 DB 改用 Domain I18n Schema，tRPC 保留接口错误消息与 Optional 输入规则，并兼容导出 Domain `I18n` 类型。
- [x] 5.4 运行 I18n、DB、tRPC Schema 与包边界相关测试，确认生产代码反向依赖清零。

## 6. 最终验证

- [x] 6.1 运行全量测试、类型检查、Lint、生产构建、差异检查与 OpenSpec 严格校验。
