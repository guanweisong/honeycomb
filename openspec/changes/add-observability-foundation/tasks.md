## 1. 观测核心

- [x] 1.1 在 `harden-runtime-foundations` 完成后建立 observability core、adapters 和 server 模块边界
- [x] 1.2 定义 Logger、Metrics、固定事件名、固定指标名和允许标签类型
- [x] 1.3 实现递归脱敏、安全错误序列化和循环引用处理并达到关键模块覆盖门槛
- [x] 1.4 实现单行 JSON console logger、noop metrics 和 memory test adapters
- [x] 1.5 实现不会递归报错的 adapter 安全包装，验证 adapter 故障不影响业务

## 2. 请求与错误捕获

- [x] 2.1 在 Next.js instrumentation 初始化默认 adapters，并实现服务端请求错误捕获
- [x] 2.2 在 tRPC context 建立 request ID，兼容传入标识和服务端生成
- [x] 2.3 新增 tRPC middleware 记录请求开始、完成、耗时、outcome 和未处理错误
- [x] 2.4 为成功、验证失败、权限拒绝和未知错误编写请求日志与 API 指标测试

## 3. 数据库与缓存指标

- [x] 3.1 实现命名数据库操作包装器，记录 operation、query name、outcome 和耗时
- [x] 3.2 为全部 Router service 和关键直接数据库调用分配稳定 query name 并接入包装器
- [x] 3.3 扩展 Upstash 缓存工具记录 read、hit、miss、write 和 error
- [x] 3.4 验证数据库和缓存指标不包含 SQL、参数、资源 ID、请求 ID或错误自由文本

## 4. 外部服务与日志迁移

- [x] 4.1 为 CAPTCHA、邮件和对象存储调用记录次数、耗时与失败
- [x] 4.2 将现有服务端及管理端直接 `console.*` 调用迁移到统一 Logger
- [x] 4.3 增加 ESLint 或静态检查，禁止受控目录新增直接 `console.*`
- [x] 4.4 为邮件地址、IP、token、cookie、authorization 和嵌套秘密增加脱敏回归测试

## 5. 验证与文档

- [ ] 5.1 运行类型检查、Lint、全量单测、生产构建和相关 E2E
- [ ] 5.2 用 memory adapter 验证 API、数据库、缓存与外部服务成功/失败指标完整性
- [ ] 5.3 更新 README，记录日志字段、指标目录、标签约束和 adapter 扩展方式
- [ ] 5.4 输出未来接入 OpenTelemetry/Sentry/平台原生 adapter 的接口说明，但不引入供应商依赖
