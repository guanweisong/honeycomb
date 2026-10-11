## ADDED Requirements

### Requirement: Blog 与 Admin 的非骨架加载提示使用共享 LoadingState

Blog 与 Admin 中显示的非骨架 loading 反馈 SHALL 通过共享 `LoadingState` 呈现。覆盖路由和 Suspense fallback、局部查询、增量加载、动态模块，以及当前以文案或图标明确表示等待的操作状态。提示 MUST 保留与当前操作相符的文案和状态行为。

#### Scenario: Blog 或 Admin 显示路由 fallback
- **WHEN** blog 或 admin 页面进入路由级或 Suspense fallback
- **THEN** 页面使用共享 `LoadingState` 展示对应加载状态

#### Scenario: Admin 认证或路由检查等待
- **WHEN** Admin 登录页或 dashboard 的认证/权限边界仍在等待
- **THEN** fallback 使用共享 `LoadingState`，并保留现有页面导航及访问控制行为

#### Scenario: 局部内容或操作等待
- **WHEN** blog 或 admin 中的查询区域、列表增量加载、动态模块或带有 pending 文案/图标的操作正在等待
- **THEN** 加载提示通过适配页面、区域或行内位置的 `LoadingState` 呈现，并保留原有上下文文案与禁用逻辑

### Requirement: 加载提示适配所在区域并提供可访问状态

共享 `LoadingState` SHALL 支持页面、区域和行内呈现，使用适合对应位置的容器语义、尺寸和间距。加载状态 MUST 向辅助技术提供简短且准确的状态说明；装饰性 spinner MUST 从屏幕阅读器阅读顺序中隐藏。

#### Scenario: 行内控件显示加载状态
- **WHEN** 菜单项、按钮或列表尾部显示 pending 状态
- **THEN** `LoadingState` 使用行内呈现，不引入页面或区域级最小高度

#### Scenario: 区域显示加载状态
- **WHEN** 局部内容区或遮罩显示加载状态
- **THEN** `LoadingState` 使用区域呈现，且 busy 状态作用于正在加载的内容区域

### Requirement: 现有骨架屏保持不变

Blog 与 Admin 的骨架屏 SHALL 继续使用现有骨架组件与内容专属占位结构；本次变更 MUST NOT 将其替换为 `LoadingState`，也 MUST NOT 改变其占位形状、数量或展示方式。

#### Scenario: 图表、安全设置或登录项显示骨架屏
- **WHEN** 现有骨架屏进入加载状态
- **THEN** 页面继续显示相同的骨架组件与占位结构
