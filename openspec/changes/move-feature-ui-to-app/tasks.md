## 1. 清点与归属

- [x] 1.1 清点 feature 浏览器 UI 的实现、导出、消费者、测试、mock、动态加载和展示配置，形成逐路径映射。
- [x] 1.2 区分 UI、业务操作和业务转换，保留通知邮件、server 操作、规则、schema、契约及非 UI 转换。

## 2. 按应用路由迁移 UI

- [x] 2.1 将后台路由 UI、React hooks、客户端 tRPC action/query、列定义、选项和展示 helper 迁到 `src/app/admin`，把现有 feature 页面实现放入对应真实路由入口。
- [x] 2.2 将博客公开 UI 与其客户端 hooks/展示 helper 迁到 `src/app/(blog)`；将登录 UI 迁到登录路由的 `components` 目录。
- [x] 2.3 同步所有静态/动态 import、相对资源、测试/mock、夹具和配置路径，删除旧 UI 源码路径。
- [x] 2.4 将 dashboard 浏览器 UI 从路由组根 `components/features` 拆到实际页面路由的 `components`；真正跨页面共用的组件直接放 dashboard 根 `components`，业务内部共用模块放业务路由组。

## 3. 更新边界与说明

- [x] 3.1 更新 feature 目录与依赖架构门禁，拒绝浏览器 UI 留在 feature，保留通知邮件模板的窄例外。
- [x] 3.2 更新主规范、feature 导航与前端结构说明，消除 feature 自有浏览器 UI 的过时描述。
- [x] 3.3 更新组件归属架构测试与当前迁移说明，禁止 dashboard 根 `components` 下出现 `features` 或业务目录。

## 4. 交付检查

- [x] 4.1 复核全部旧 UI 路径无生产消费者、`components` 目录不包含 App Router 入口文件、路由 URL 与 RSC/client 指令保持，检查 diff 和迁移映射。
- [x] 4.2 按用户验证范围报告结果；本次不运行测试或验证命令。
- [x] 4.3 按当前验证范围确认 dashboard 根仅保留共用组件、consumer 路径已更新；本次不运行测试或验证命令。
