## ADDED Requirements

### Requirement: 猜猜你喜欢列表仅文本可交互
归档详情页中的“猜你喜欢”列表链接 SHALL 仅在文字内容范围内响应 hover 和 click，不 SHALL 将整行列表项作为可交互区域。

#### Scenario: 鼠标悬停只作用于文字
- **WHEN** 用户将鼠标移动到“猜你喜欢”列表项的文字上
- **THEN** 该文字 SHALL 显示链接 hover 状态
- **AND** 列表项中超出文字宽度的空白区域 SHALL 不响应 hover 状态

#### Scenario: 点击只作用于文字
- **WHEN** 用户点击“猜你喜欢”列表项的文字
- **THEN** 系统 SHALL 跳转到对应文章详情页
- **AND** 用户点击文字外的同一行空白区域时 SHALL 不触发跳转
