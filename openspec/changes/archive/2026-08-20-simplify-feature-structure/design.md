# 设计

## 模块分类

`post`、`comment`、`user` 作为复杂模块，继续保留 `domain`、聚合、领域事件和必要的拆分服务。只合并没有独立职责的入口目录和转发文件。

`category`、`link`、`media`、`menu`、`page`、`setting`、`tag` 作为简单模块，优先收敛为：

```text
feature/
  service.ts
  repository.ts       # 只有真实持久化端口时保留
  router.ts
  admin.tsx           # 有独立管理 UI 时保留
  public.tsx          # 有跨模块公开消费时保留
  infrastructure/
```

目录只有在承载多个有内聚性的文件时才保留。文件移动后，所有消费者改为依赖新的公开入口，不新增 facade 或兼容转发层。

## 依赖规则

- service 不导入 Drizzle、数据库连接或 ORM schema。
- 数据库映射和外部客户端继续位于 infrastructure。
- 跨 feature 继续只能依赖 public 或共享公开契约。
- transport 只负责输入适配、权限和依赖注入。
- 复杂模块的 domain 规则不迁移到 UI、router 或 repository。

## 迁移顺序

1. 先扩展边界测试，固定新的公开入口和禁止旧入口。
2. 迁移低耦合 CRUD 模块：category、setting、tag、link。
3. 迁移 menu、page、media，保留 media 的共享编辑器能力。
4. 扁平化 post、comment、user 的纯转发入口，不触碰领域模型。
5. 更新架构文档，删除空目录和废弃转发文件。

## 验证

执行类型检查、Lint、单元测试、feature/package 边界测试、生产构建和 `git diff --check`；确认所有现有路由和 tRPC procedure 名称未变化。
