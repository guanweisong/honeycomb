## Purpose

后台多个列表需要统一的状态徽章展示，以便用颜色快速区分启用、禁用、已删除、待审核、已发布、垃圾评论和已屏蔽等状态。

## Requirements

### Requirement: 后台列表状态使用 Badge 展示
后台列表在状态列展示状态值时，系统 SHALL 使用 `shadcn/ui` 的 `Badge` 组件进行渲染。

#### Scenario: 友情链接状态以 Badge 呈现
- **WHEN** 管理员查看友情链接列表中的状态列
- **THEN** 系统 SHALL 以 `Badge` 形式展示状态值

#### Scenario: 用户管理状态以 Badge 呈现
- **WHEN** 管理员查看用户管理列表中的状态列
- **THEN** 系统 SHALL 以 `Badge` 形式展示状态值

#### Scenario: 页面状态以 Badge 呈现
- **WHEN** 管理员查看页面列表中的状态列
- **THEN** 系统 SHALL 以 `Badge` 形式展示状态值

#### Scenario: 文章状态以 Badge 呈现
- **WHEN** 管理员查看文章列表中的状态列
- **THEN** 系统 SHALL 以 `Badge` 形式展示状态值

#### Scenario: 分类状态以 Badge 呈现
- **WHEN** 管理员查看分类列表中的状态列
- **THEN** 系统 SHALL 以 `Badge` 形式展示状态值

#### Scenario: 评论状态以 Badge 呈现
- **WHEN** 管理员查看评论列表中的状态列
- **THEN** 系统 SHALL 以 `Badge` 形式展示状态值

### Requirement: 后台状态 Badge 使用语义颜色区分
系统 SHALL 根据状态值为状态 `Badge` 使用语义颜色，并满足以下规则：
- 启用、已发布使用绿色
- 禁用、已封禁使用红色
- 待审核使用琥珀色
- 已删除、垃圾评论使用灰色

#### Scenario: 启用状态显示绿色
- **WHEN** 状态值为启用
- **THEN** 系统 SHALL 使用绿色 `Badge` 展示该状态

#### Scenario: 已发布状态显示绿色
- **WHEN** 状态值为已发布
- **THEN** 系统 SHALL 使用绿色 `Badge` 展示该状态

#### Scenario: 禁用状态显示红色
- **WHEN** 状态值为禁用
- **THEN** 系统 SHALL 使用红色 `Badge` 展示该状态

#### Scenario: 已封禁状态显示红色
- **WHEN** 状态值为已封禁
- **THEN** 系统 SHALL 使用红色 `Badge` 展示该状态

#### Scenario: 待审核状态显示琥珀色
- **WHEN** 状态值为待审核
- **THEN** 系统 SHALL 使用琥珀色 `Badge` 展示该状态

#### Scenario: 已删除状态显示灰色
- **WHEN** 状态值为已删除
- **THEN** 系统 SHALL 使用灰色 `Badge` 展示该状态

#### Scenario: 垃圾评论状态显示灰色
- **WHEN** 状态值为垃圾评论
- **THEN** 系统 SHALL 使用灰色 `Badge` 展示该状态

### Requirement: 状态文案保持不变
系统 SHALL 保持后台各列表的状态文案内容不变，仅调整状态的视觉展示方式。

#### Scenario: 状态文本不被重写
- **WHEN** 管理员查看状态列
- **THEN** 系统 SHALL 显示与当前业务一致的状态文案
- **AND** SHALL 仅通过颜色和 `Badge` 样式增强区分

### Requirement: 状态徽章组件保持通用
后台状态徽章组件 SHALL 仅接收展示语义与文案，不应绑定具体业务状态枚举。

#### Scenario: 组件按语义色渲染
- **WHEN** 业务层传入绿色、红色、琥珀色或灰色语义
- **THEN** 组件 SHALL 按对应颜色渲染 `Badge`

#### Scenario: 业务层负责状态映射
- **WHEN** 不同列表存在不同状态枚举
- **THEN** 业务层 SHALL 负责将状态值映射为通用语义色
