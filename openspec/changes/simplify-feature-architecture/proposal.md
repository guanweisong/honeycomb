## 为什么

现有未发布 packages 和 feature 人工分层让普通业务在 router、用例、handler、Repository 接口及 factory 间跳转，业务类型与 UI 所有权分散。改为用户批准的简单 feature 架构，让真实规则和安全边界更容易阅读与测试。

## 变更内容

- 采用 app / features / components / lib 职责，移除 src/packages 与人工 application/domain/infrastructure 层。
- 根 tRPC router/caller 归 app/trpc，lib/trpc 保留公共核心、上下文、客户端与传输工具。
- 业务 schema、types、rules、server 及 admin/public UI 归所属 feature；直接数据库操作取代无职责 Repository、factory、Use Case 和 handler 跳转。
- 同步路径、配置、测试、文档、技能与当前规格，不保留中央 contracts 或兼容转发入口。
- 保留发布/账号规则、权限与 GUEST 范围、事务/并发保护、缓存降级、媒体副作用、草稿恢复、Sentry 隐私及运行时隔离。

## 能力

### 新增能力

无新增产品能力。

### 修改能力

- `feature-module-contract`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `normalized-content-translations`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `type-safety-governance`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `api-security-boundaries`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `architecture-complexity-governance`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `side-effect-consistency`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `feature-business-boundaries`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `package-layer-cleanup`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `module-boundaries`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `content-command-contracts`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `package-layer-architecture`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `package-boundaries`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `public-content-freshness`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `persistence-integrity`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `application-use-case-boundary`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `admin-module-boundaries`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `documentation-workflow-cleanup`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。
- `model-boundary-governance`：同步 feature 所有权、直接服务端操作或技术边界表述，保留对应行为约束。

## 影响与非目标

修改源码布局、导入、配置、测试、长期文档及架构规格。既有 URL、公开接口、数据库 schema/迁移、依赖版本、安全配置和产品行为不变。历史归档仍是历史证据，不将旧验证结果沿用于本轮。不提交、推送、创建 PR、合并、部署或执行生产写入。
