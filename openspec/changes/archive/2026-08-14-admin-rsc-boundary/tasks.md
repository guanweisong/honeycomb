## 任务

- [x] 为服务端认证函数编写有效用户、无会话和禁用用户测试
- [x] 实现 `getAdminUser` 服务端认证函数并通过测试
- [x] 新增 `AdminProviders` 客户端 Provider 容器
- [x] 将 admin 根布局改为服务端组件并接入 Provider 容器
- [x] 将 `/admin` 重定向改为服务端重定向
- [x] 将认证根布局改为服务端组件，并在 dashboard route layout 实施服务端守卫
- [x] 将 dashboard 布局改为服务端壳层并保留客户端登出交互
- [x] 将 login 页面拆分为服务端数据层和客户端交互层
- [x] 将客户端 Provider 下沉到 dashboard 路由，避免 login 加载后台交互依赖
- [x] 将设置页拆分为服务端数据读取和客户端表单交互
- [x] 将 dashboard 服务端用户快照注入客户端缓存，减少权限查询重复请求
- [x] 将 loading fallback 下沉到 dashboard 路由，避免 login 与后台共用加载界面
- [x] 运行 admin 测试、类型检查和生产构建
