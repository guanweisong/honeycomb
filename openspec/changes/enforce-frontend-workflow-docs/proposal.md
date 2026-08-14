## 为什么

当前工程已经以 OpenSpec 作为需求、设计、任务和归档的唯一工作流，但仓库仍保留 `docs/superpowers` 设计文档，且部分活动 OpenSpec 文档使用英文标题和内容。前端结构测试也没有完整约束组件目录命名，容易造成流程和目录规范漂移。

## 变更内容

- 清理不再作为事实来源的 `docs/superpowers` 设计文档。
- 将活动变更中的英文 OpenSpec 文档统一为中文。
- 明确单文件业务模块与多文件模块的目录规则。
- 增强 App Router 业务组件目录测试，覆盖组件目录命名和文件形态。
- 增加中文工作流治理规格，作为后续维护依据。

## 影响范围

- `openspec/changes` 文档
- `docs/superpowers`
- `src/app/app-structure.test.ts`
- 前端工程工作流文档
