## 1. 覆盖率真实口径

- [x] 1.1 在前三个 change 完成后将 coverage include 显式设置为全部生产 TypeScript/TSX 源码
- [x] 1.2 建立有理由的排除清单，并验证业务页面、hooks、services 和安全核心不被排除
- [x] 1.3 运行完整覆盖率获取真实基线，列出低于目标的关键模块并优先补测
- [x] 1.4 启用 statements/lines 70%、functions 65%、branches 60% 的全局门槛
- [x] 1.5 为权限、环境变量、脱敏、sitemap、缓存和观测核心启用 statements/lines 90%、branches 80% 门槛

## 2. DataTable 模块化

- [ ] 2.1 为现有分页、排序、筛选、选择、禁用行、空状态和错误状态补充回归测试
- [ ] 2.2 抽取 `useDataTableState`、参数归一化和页码/选择重置逻辑
- [ ] 2.3 抽取 `useRowSelection` 并覆盖当前页全选、取消和禁用行行为
- [ ] 2.4 抽取 Header、Body、Toolbar、Pagination 和公共 types 模块
- [ ] 2.5 保留 DataTable facade props 和泛型接口，并验证全部现有消费者无需行为性修改

## 3. 第一批管理页面

- [ ] 3.1 拆分 menu 页的 query、actions、树编辑和页面组合并运行 menu E2E
- [ ] 3.2 拆分 user 页的 query、actions、columns、form/dialog 和页面组合并运行权限回归
- [ ] 3.3 拆分 link 页的 query、actions、columns、form/dialog 和页面组合并运行 CRUD 回归

## 4. 第二批管理页面

- [ ] 4.1 拆分 media 页的 query、上传 actions、媒体呈现和页面组合并运行上传回归
- [ ] 4.2 拆分 page edit 的数据编排、表单转换、actions 和编辑 UI 并运行创建/编辑回归
- [ ] 4.3 拆分 comment 页的 query、moderation actions、columns 和页面组合并运行审核回归

## 5. 架构与质量验证

- [ ] 5.1 为每个页面抽取的纯转换、query 参数和 action 状态增加单元测试
- [ ] 5.2 检查页面特有模块保持 feature-local，移除没有两个稳定消费者的过早共享抽象
- [ ] 5.3 运行类型检查、Lint、完整覆盖率、生产构建和全部 Playwright E2E
- [ ] 5.4 对比重构前后 URL、tRPC 输入输出、权限结果、视觉文案和主要交互流程
- [ ] 5.5 更新 README 或架构文档，记录覆盖率口径、门槛和管理 feature 目录约定
