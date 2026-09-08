## ADDED Requirements

### Requirement: 后台公共 Provider 只持有全局消费者
admin dashboard 公共 Provider SHALL 只包含所有后台页面共同需要的认证、站点设置、tRPC 和查询缓存能力；媒体选择器和编辑器专属 Provider MUST 下沉到内容编辑路由。

#### Scenario: 访问普通后台列表
- **WHEN** 用户访问评论、用户、设置或链接列表
- **THEN** 公共布局不初始化文章编辑器媒体选择能力

#### Scenario: 访问文章或页面编辑器
- **WHEN** 用户进入需要富文本媒体选择的编辑路由
- **THEN** 路由局部 Provider 提供既有选图能力
