## 1. 建立只读生产基线

- [ ] 1.1 新增迁移治理测试，验证 `drizzle/` 必须进入版本控制且 schema 变化需要迁移
- [ ] 1.2 使用生产凭据只读 introspect 到隔离临时目录，并记录表、列、索引、外键和约束清单
- [ ] 1.3 对比 introspection 结果与 `src/packages/infrastructure/db/schema`，生成差异报告并阻断未解决差异

## 2. 生成并验证版本化 baseline

- [ ] 2.1 删除本地未追踪旧迁移并移除 `.gitignore` 中对 `drizzle/` 的忽略
- [ ] 2.2 从已审查的生产结构生成单一 baseline SQL、snapshot 和 journal
- [ ] 2.3 在全新临时数据库执行 baseline，再次 introspect 并验证结构等价
- [ ] 2.4 新增 CI schema/迁移同步检查和独立脚本

## 3. 部署与接管文档

- [ ] 3.1 更新 README，区分本地 `push`、版本化 `generate` 和受控环境 `migrate`
- [ ] 3.2 编写新环境初始化、生产备份、现有生产 ledger 接管和回滚说明
- [ ] 3.3 保持生产写入步骤未执行，并将 ledger 登记列为需要再次明确批准的发布操作

## 4. 验证

- [ ] 4.1 运行迁移治理测试、类型检查、Lint、完整单元测试和 `git diff --check`
- [ ] 4.2 运行生产构建并确认构建阶段不会连接或修改生产数据库
