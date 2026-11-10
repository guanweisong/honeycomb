## MODIFIED Requirements

### Requirement: 业务概念归属于 Feature

用户、内容、菜单等业务状态、类型、schema 和选项 MUST 归属相应 feature。通用国际化、数据库、认证、缓存和存储等技术能力 SHALL 位于 lib。跨多个 feature、没有唯一业务 feature 所有者的启用开关目录 `EnableStatus` MAY 保留在 `src/lib/validation/enable-status.ts`，作为唯一的 `ENABLE` / `DISABLE` 定义；此例外 MUST NOT 扩展到 feature 专属状态、类型、schema 或选项。

#### Scenario: 引用文章状态

- **WHEN** 数据库、router 或 UI 需要文章状态
- **THEN** 它们 SHALL 复用 post feature 拥有的同一纯目录，不建立共享 domain 或 contracts 副本

#### Scenario: 复用中立启用开关

- **WHEN** Category、Link、Menu、Post 评论开关、Comment 或数据库 schema 需要通用启用/禁用值
- **THEN** 它们 SHALL 复用 `src/lib/validation/enable-status.ts` 中唯一的 `EnableStatus` 定义；Post、Page、Comment、User 等 feature 专属状态仍 MUST 由各自 feature 持有
