# 代码阅读地图

先找功能入口，再顺着实际调用走。目录不是必须逐层经过的流水线；简单读取不需要空用例，只有业务规则才需要聚合。

## 三条常用路径

### 修改文章

1. 编辑交互：`src/features/post/admin/edit/hooks/use-post-editor.tsx`。
2. API 输入、权限与依赖组装：`src/features/post/post.router.ts`。
3. 写入顺序、状态转换与缓存失效：`src/features/post/application/post-commands.ts`。需要核对发布规则时才进入 `domain/post.ts`。
4. 持久化：`src/features/post/infrastructure/post-command-repository.ts`；接口与返回模型由 `application/repository.ts` 持有。

用例返回持久化结果与公开同步状态，不能把缓存同步降级误报成写入失败。router 不直接写数据库，用例不创建数据库连接。

### 读取公开内容

1. 页面组合：`src/app/(blog)/[locale]` 对应路由。
2. 框架缓存和请求内去重：`src/app/lib/server/public-queries.ts`。
3. feature router 的公开查询与仓储适配器。例如文章读取由 `post.router.ts` 进入 `infrastructure/post-query-repository.ts`，特殊缓存读取由 `post-special-repository.ts` 处理。
4. UI 消费所属 feature 的应用读取模型；跨 feature 通过 `src/features/contracts` 或该 feature 的 `public` 出口。

评论公共 DTO 的真实字段选择在 `src/features/comment/application/comment-public-dto.ts`，不能用类型别名代替脱敏。评论组件接收数据 Promise，不反向引用 app 查询实现。

### 后台当前用户与权限

1. 服务端会话和启用状态复核：`src/features/user/admin-user.ts`。
2. 页面提供初始用户：`src/app/admin/AdminProviders.tsx`。
3. 客户端当前用户与刷新：`src/packages/ui/admin/use-current-user.ts`。
4. 权限规则：`src/packages/identity/auth/permissions.ts` 与 `authorize.ts`；服务端 API 入口仍是最终授权边界。

`useCan` 只控制界面呈现，不能替代服务端授权。共享 contracts 不创建 React context，也不发起请求。

## 改动放哪里

| 要改什么                       | 先去哪里                                  |
| ------------------------------ | ----------------------------------------- |
| 输入校验与业务契约             | 所属 feature 的 `application` / `schemas` |
| 多步写入、外部副作用的先后顺序 | 所属 feature 的 `application`             |
| 状态不变量                     | 所属 feature 的 `domain`                  |
| SQL、存储或外部客户端          | `infrastructure`                          |
| 枚举值与共享业务规则           | `src/packages/domain`                     |
| 中文显示名称和选项顺序         | `src/packages/ui/admin/*-options.ts`      |
| 路由、框架缓存、页面组装       | `src/app`                                 |

应用模型只定义一次。`features/contracts` 是有意保留的跨模块出口，直接重新导出权威模型；不要再添加只改名的 presentation 文件。只有数据裁剪、转换或真正不同的展示语义才值得独立适配。

## 如何防止边界退化

`tests/readability-boundaries.test.ts`、命令阅读路径和领域展示选项检查守住本轮精简；既有 `feature-boundaries`、`single-source-contracts`、权限和公开缓存边界测试继续守住业务分层。新功能优先照实际流程放置，不为了目录对称增加文件。
