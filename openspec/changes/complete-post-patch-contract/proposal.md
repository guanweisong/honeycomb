## Why

减法后的 v2 第 4.2 节要求文章翻译显式删除和拒绝未支持字段。第一切片保留旧删除协议，本变更完成这一明确的剩余合同，不改变页面双语必填和设置清空行为。

## What Changes

- 文章更新支持 removeLocales，和同语言修改冲突时拒绝。
- 空值只清空可空翻译值，不隐式删除既有语言行；未提交语言不变，空字符串仍是值。
- 文章创建和更新在传输与直接命令边界使用同一严格输入 schema；未知顶层、未知语言及服务器拥有字段明确拒绝。

## Capabilities

### New Capabilities
- `post-patch-contract`: 文章翻译显式删除与严格写入输入。

### Modified Capabilities
- `normalized-content-translations`: 文章清空字段不再隐式删除语言行；其他实体不变。

## Impact

仅文章输入、翻译映射、写命令和验证。不涉及数据库迁移、UI、生产数据、提交或发布。
