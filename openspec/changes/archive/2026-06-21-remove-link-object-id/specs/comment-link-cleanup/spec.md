## ADDED Requirements

### Requirement: 移除友情链接页专用 ObjectId 依赖
系统 SHALL 不再依赖 `LINK_OBJECT_ID` 环境变量识别友情链接页，也 SHALL 不再把友情链接页映射为固定的 `/links` 评论地址。

#### Scenario: 生成评论邮件链接时不读取友情链接 ObjectId
- **WHEN** 系统为评论通知构建自定义页面链接
- **THEN** 系统 SHALL 只基于评论本身的关联信息生成链接
- **THEN** 系统 SHALL NOT 读取 `LINK_OBJECT_ID`

#### Scenario: 网站设置不再暴露友情链接 ObjectId
- **WHEN** 前端请求网站全局设置
- **THEN** 返回结果 SHALL NOT 包含来自 `LINK_OBJECT_ID` 的友情链接页标识
