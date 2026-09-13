## 1. 查询层收敛

- [x] 1.1 增加查询层架构测试，识别只转发 Repository 的读取函数并验证测试夹具会失败
- [x] 1.2 将纯转发查询调用改为直接调用 Query/Repository，删除无消费者的包装与测试

## 2. Feature 写入边界门禁

- [x] 2.1 增加 mutation AST 测试夹具，覆盖未调用本 Feature Application 的违规入口
- [x] 2.2 动态发现所有 Feature Router，并验证每个 mutation handler 调用 Application 可执行函数

## 3. 数据库 Schema 模块化

- [x] 3.1 将内容表定义拆分到同级领域文件，保留 `content.ts` 和 `schema/index.ts` 的兼容导出
- [x] 3.2 迁移门禁按实际结构比对；运行迁移回放检查，确认无数据库结构差异

## 4. 工程文档和配置

- [x] 4.1 修正过时的 Admin redirect 注释并更新当前覆盖率基线
- [x] 4.2 修复 Vitest/Vite 模块加载警告，且不改变依赖版本和模块语义

## 5. 最终验证

- [x] 5.1 运行类型检查、Lint、相关架构测试、全量单测、覆盖率和进程测试
- [x] 5.2 运行 OpenSpec 校验及 diff 检查，确认工作区没有生成迁移或运行时行为变化
