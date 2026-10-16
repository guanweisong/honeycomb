## ADDED Requirements

### Requirement: 演示账号读取受限

系统 SHALL 保留 GUEST 后台入口，但 MUST NOT 向其返回评论邮箱、IP、User-Agent 或未发布文章和页面。

#### Scenario: GUEST 请求后台内容

- **WHEN** GUEST 请求后台文章或页面列表、显式筛选草稿或请求草稿详情
- **THEN** 服务端仅允许已发布内容，列表总数遵守相同范围且详情不返回草稿

#### Scenario: GUEST 请求评论

- **WHEN** GUEST 直接请求后台评论 API
- **THEN** 响应不包含隐私字段或未发布关联内容，且不能通过隐私筛选推断字段值

#### Scenario: 正常编辑权限保持

- **WHEN** ADMIN 或 EDITOR 请求其有权限读取的后台内容
- **THEN** 原有合法读取结果保持不变

### Requirement: 保存不覆盖后续输入

系统 SHALL 保留文章更新请求期间的新输入，并 MUST NOT 用旧刷新结果覆盖独立更新的辅助选择。

#### Scenario: 保存期间继续输入

- **WHEN** 用户提交文章更新后，在写入或刷新完成前继续编辑
- **THEN** 已提交内容保存完成，新编辑保留并仍为未保存状态

#### Scenario: 创建期间防止输入丢失

- **WHEN** 新文章正在创建或跳转到编辑地址
- **THEN** 表单暂时不可交互，不接受随后被路由切换丢弃的输入

#### Scenario: 离开记录

- **WHEN** 用户在保存完成前导航到另一条记录
- **THEN** 旧请求不得重置当前编辑器或抢回导航
