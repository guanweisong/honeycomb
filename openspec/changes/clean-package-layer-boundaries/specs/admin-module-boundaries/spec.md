## MODIFIED Requirements

### Requirement: 大型管理页使用 feature 边界
系统 SHALL 将 menu、user、link、media、page edit、comment、tag 和 post category 页面的查询、mutation、列定义、对话框、表单转换和页面组合职责分离。管理后台 feature 的共享辅助代码目录 MUST 使用 `lib` 或 `constants` 这类正确且一致的命名。

#### Scenario: 打开管理页面
- **WHEN** 用户进入任一已迁移管理页面
- **THEN** page shell 组合 feature 模块且不直接承载全部请求、表单和对话框实现

#### Scenario: 引用后台辅助代码
- **WHEN** 管理后台 feature 引用本区域的帮助函数或常量
- **THEN** 导入路径使用一致、正确的 `lib` 或 `constants` 目录名
