## ADDED Requirements

### Requirement: 账号安全标签与 URL 同步
系统 MUST 使用 `tab` 查询参数表示账号安全页当前选中的标签，并只接受 Passkey、修改密码、登录会话、关联账号和登录历史对应的预定义值。

#### Scenario: 通过链接打开指定标签
- **WHEN** 用户访问带有有效 `tab` 查询参数的账号安全 URL
- **THEN** 系统展示该参数对应的标签内容

#### Scenario: 切换标签
- **WHEN** 用户在账号安全页选择另一个标签
- **THEN** 系统在不滚动页面的情况下将该标签值写入 URL，并创建可供浏览器前进后退恢复的历史记录

#### Scenario: 缺失或非法标签参数
- **WHEN** URL 未提供 `tab` 参数或提供未支持的值
- **THEN** 系统展示 Passkey 标签内容

#### Scenario: 浏览器历史导航
- **WHEN** 用户在切换标签后使用浏览器前进或后退
- **THEN** 系统根据当前 URL 的 `tab` 参数展示对应标签内容
