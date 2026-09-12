## 1. 契约收敛

- [ ] 1.1 先增加唯一事实源失败测试，覆盖 Setting schema 归属、Menu 保存 schema 推导与开放索引签名、Comment 唯一缓存端口
- [ ] 1.2 在 Setting Application 建立后台更新与内部 nullable patch schema，迁移 Repository、transport、表单和测试消费者
- [ ] 1.3 将 Menu 保存 schema 移入 Application，由 schema 推导输入类型并移除 MenuItem 开放索引签名
- [ ] 1.4 让 Link、Category 等状态写入和读取模型从 EnableStatus 派生，并在持久化读取边界验证枚举
- [ ] 1.5 将 Comment 创建、更新和删除统一迁移到 PublicContentInvalidator.invalidate(plan)，删除兼容端口与函数

## 2. 副作用成功边界

- [ ] 2.1 先增加缓存首次失败恢复、持续失败降级、Repository 失败不失效的失败测试
- [ ] 2.2 为 PublicContentInvalidator 定义 completed/degraded 结果并实现完整计划最多两次执行
- [ ] 2.3 为缓存持续失败补充脱敏结构化日志和低基数指标，保持各写入 Use Case 原业务成功响应
- [ ] 2.4 更新全部内容写入行为测试，证明数据库提交后缓存降级不再转换为 API 失败
- [ ] 2.5 先增加媒体对象已删但数据库异常时返回 indeterminate 的失败测试
- [ ] 2.6 实现媒体删除可判别结果并更新后台 action/UI 提示及幂等重试测试

## 3. 数据库不变量

- [ ] 3.1 先增加隔离数据库约束测试，证明非法枚举、负数、非法评论目标和第二条 Setting 当前可写入
- [ ] 3.2 为 Drizzle schema 增加从权威枚举派生的 CHECK、非负数 CHECK、评论目标 XOR 与 Setting 单例键
- [ ] 3.3 增加只读迁移前置审计，按表、字段、数量报告不兼容数据且不输出敏感值
- [ ] 3.4 生成并审查版本化迁移、Snapshot 与 Journal，确保迁移遇到歧义数据时中止而不自动清洗
- [ ] 3.5 在独占临时 SQLite 中验证合法数据迁移、非法数据阻断、约束执行和 Repository 单例读取

## 4. 治理门禁

- [ ] 4.1 先为 SQL/Journal/Snapshot 单向缺失和迁移重放结构漂移增加失败测试
- [ ] 4.2 加强 check-migrations，验证三类工件双向对应、连续索引及重放结构与当前 schema 一致
- [ ] 4.3 先增加跨 Feature domain、infrastructure、schemas、presentation 深导入的失败夹具
- [ ] 4.4 扩大 Feature 边界扫描并保留 features/contracts 与显式 public 出口
- [ ] 4.5 更新 OpenSpec 主规格、工程技能文档和 CI 门禁说明，使约束与实现保持一致

## 5. 完整验证

- [ ] 5.1 在隔离临时数据库运行相关迁移、Repository、约束和完整单元测试
- [ ] 5.2 运行 check-types、lint、覆盖率、进程测试、迁移门禁和 git diff --check
- [ ] 5.3 使用项目规定的构建环境运行生产构建，并记录尚未执行的生产审计与部署前置条件
- [ ] 5.4 复查权威定义、刻意保留的不同语义、缓存/存储降级边界和所有临时资源清理结果
