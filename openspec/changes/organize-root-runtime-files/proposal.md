## 为什么

src/app 根目录混放了非框架入口的 PWA 实现、跨路由 sitemap helper 和跨边界恢复测试。按真实消费者归组，保留 Next 自动发现入口及其作用域，避免把目录整洁误做运行时重构。

## 变更内容

- 六个 PWA 实现/测试保持文件名迁到 app/_pwa，构建入口同步，公开 worker URL 不变。
- sitemap-data 迁到既有 app/lib/server，增加 server-only 并同步消费者、精确覆盖率门槛与保护路径。
- 跨三个错误边界的恢复测试迁到 tests/integration，保持全部断言。
- 同步当前规范、工程导航和类型台账；不改历史记录、auth、404、Provider、manifest 或依赖版本。

## 能力

### 新增能力

无。

### 修改能力

- pwa-offline-reliability：唯一 worker 源入口更新到 app/_pwa，公开输出保持不变。
- coverage-governance：精确 worker 排除路径更新，PWA 策略仍纳入覆盖。

## 影响范围

8 个被迁文件及必要的构建、导入、门禁、测试和现行文档。无新增产品 API，无数据迁移。全部仅在独立本地分支修改和验证，不发布。
