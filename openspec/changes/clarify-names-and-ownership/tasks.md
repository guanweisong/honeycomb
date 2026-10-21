## 1. 配置与规范

- [x] 1.1 GN001：项目 ESLint 配置使用了依赖包式名字
- [x] 1.2 GN002：module-boundaries 与 admin-module-boundaries 存在双重所有权
- [x] 1.3 GN003：普通媒体规范仍使用承诺恢复线索的旧标题
- [x] 1.4 GN004：独立历史切片报告藏在第二个隐藏文档根

## 2. 业务模块

- [x] 2.1 FN001：评论入口仍保留已失去服务端职责的透传组件
- [x] 2.2 FN002：CommentClient 两份测试仍 mock 已不存在的相邻 Card
- [x] 2.3 FN003：跨 feature 回归被藏在单一 feature 的测试目录
- [x] 2.4 FN004：实现已迁移，测试名和空 hooks 目录仍描述旧结构
- [x] 2.5 FN011：文章编辑 hook 测试已越过项目要求评估的千行门槛
- [x] 2.6 FN005：AddCategoryModal / AddTagDialog 实际都是新增编辑共用表单
- [x] 2.7 FN006：分类 helper 的名称没有表达真实输出或存在拼写错误
- [x] 2.8 FN007：page-draft 被放进 transforms，实际包含浏览器持久化副作用
- [x] 2.9 FN008：post-special 是混合缓存与 SQL 查询的含糊入口
- [x] 2.10 FN009：DTO 的明确名称在消费者处又被 Entity 别名抹平
- [x] 2.11 FN010：登录历史服务脱离 account-security 所有者并与同名输入构造器混淆

## 3. 前端归属

- [x] 3.1 UI001：权限门禁仍以旧 dashboard 虚拟路径描述新 feature，category 还寄存在 post 夹具
- [x] 3.2 UI002：测试按历史落点而非被测职责归属
- [x] 3.3 UI003：shared Menu 实际是后台壳导航，应明确 Admin 所有权而非与内容菜单混名
- [x] 3.4 UI004：blog 遗留 MenuEntityTree 已无消费者，不能与后台真实树类型混为一谈
- [x] 3.5 UI005：MenuLocalEntity 命名掩盖了“已本地化显示链接”而非领域实体
- [x] 3.6 UI006：Provider 与 Shell 的范围名称/注释落后于当前双应用结构
- [x] 3.7 UI007：PhotoSwipe 还公开一个已不起作用的 galleryId prop
- [x] 3.8 UI008：两个小型 blog 展示构件的公开名称可更贴近呈现职责

## 4. 基础设施与测试

- [x] 4.1 IF001：refresh-path 隐藏结构化公开内容失效适配器职责
- [x] 4.2 IF002：S3 与同名静态工厂掩盖固定 R2 适配器身份
- [x] 4.3 IF003：应用级 procedure 权限矩阵应归属整合测试
- [x] 4.4 IF004：hardening E2E 已成为按修复批次归档的多主题测试集
- [x] 4.5 IF005：少量静态门禁与单模块mock测试仍寄存在integration

## 5. 集成验证

- [x] 5.1 核对改名前后消费者、测试库存与历史引用。
- [ ] 5.2 严格规格校验、定向测试、全量单元与进程门禁。
- [ ] 5.3 独立审查、发布同一 PR 并验证精确提交的完整 CI。
