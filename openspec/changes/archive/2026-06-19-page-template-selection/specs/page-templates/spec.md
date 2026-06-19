## ADDED Requirements

### Requirement: 页面模板选择
系统 MUST 允许页面记录保存模板选择，且至少包含 `default` 和 `friendly-links` 两种取值。

#### Scenario: 创建页面时使用默认模板
- **WHEN** 用户创建页面时未显式选择模板
- **THEN** 系统 MUST 将该页面保存为 `default` 模板

#### Scenario: 选择友情链接模板
- **WHEN** 用户在创建或编辑页面时选择 `friendly-links` 模板
- **THEN** 系统 MUST 将该选择持久化到页面记录中

### Requirement: 页面模板渲染
系统 MUST 根据页面记录中保存的模板值渲染页面内容。

#### Scenario: 渲染默认页面
- **WHEN** 页面使用 `default` 模板
- **THEN** 前台 MUST 仅使用现有页面布局渲染正文内容

#### Scenario: 渲染友情链接页面
- **WHEN** 页面使用 `friendly-links` 模板
- **THEN** 前台 MUST 在渲染正文后，于正文下方展示当前启用的友情链接列表

### Requirement: 替换固定 links 路由
在页面模板方案可用后，系统 MUST 不再依赖前台写死的 `/links` 页面来展示友情链接内容。

#### Scenario: 访问友情链接内容
- **WHEN** 用户在变更后访问站点的友情链接内容
- **THEN** 该内容 MUST 由一个使用 `friendly-links` 模板的普通页面提供，而不是由专门写死的 links 页面提供
