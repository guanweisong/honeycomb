## Purpose

通过业务功能聚合降低跨技术目录查找和修改成本，同时保留现有技术层边界和外部行为契约。

## Requirements

### Requirement: 业务功能聚合

系统 SHALL 为 Comment、Post 和 Media 提供独立的 `src/features/<功能>` 目录，并将同一功能的业务用例、传输适配和路由区域代码组织在其下。

#### Scenario: 查找功能实现

- **WHEN** 开发者处理 Comment、Post 或 Media 功能
- **THEN** 该功能的主要 application、transport、admin 或 public 实现可以从对应 feature 目录发现

### Requirement: 技术基础层保持稳定

系统 MUST 保留 `domain`、`identity`、`infrastructure` 和 `ui` 的职责与依赖方向，不得为了业务聚合将数据库、认证或通用 UI 反向移动到 feature 内。

#### Scenario: 加载共享基础能力

- **WHEN** feature 使用领域契约、认证、数据库或通用 UI
- **THEN** feature 通过现有稳定 package 边界依赖这些能力

### Requirement: Feature 内部依赖方向

系统 SHALL 允许 feature 的 admin/public 使用本 feature 的 transport/application，且 transport 使用本 feature 的 application；系统 MUST 禁止 feature 依赖其他 feature 的内部实现。

#### Scenario: 跨功能导入

- **WHEN** Comment、Post 或 Media 的生产代码导入另一个 feature 的内部文件
- **THEN** 业务聚合边界测试失败

### Requirement: 外部契约兼容

系统 MUST 保持现有 URL、tRPC procedure、输入输出类型、权限结果、数据库行为、错误语义和用户交互不变。

#### Scenario: 迁移后调用既有 API

- **WHEN** 既有客户端调用 Comment、Post 或 Media 的 tRPC procedure
- **THEN** procedure 名称、输入输出和错误结果与迁移前一致

### Requirement: 兼容入口可逐步移除

系统 SHALL 为仍在使用旧路径的调用方提供兼容导出，并 MUST 使兼容入口仅负责转发，不复制业务实现。

#### Scenario: 使用旧 application 路径

- **WHEN** 现有模块从旧 application 路径导入 Comment、Post 或 Media 用例
- **THEN** 调用转发到 feature 实现且不产生第二份业务逻辑

### Requirement: 迁移可独立验证

系统 MUST 为每个已迁移 feature 保留相邻测试，并在迁移完成后通过类型检查、Lint、全量单元测试和生产构建。

#### Scenario: 执行迁移回归

- **WHEN** 执行工程质量门禁
- **THEN** 所有既有测试和新增 feature 边界测试通过
