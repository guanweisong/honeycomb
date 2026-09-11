# Admin 正文区域加载

## Purpose

定义 admin dashboard 菜单导航期间的后台壳稳定性、正文区域加载反馈和无障碍状态，避免局部数据等待替换全局布局，并确保用户能够持续理解当前导航与加载进度。
## Requirements
### Requirement: 后台壳在菜单导航期间保持稳定

admin dashboard 在菜单导航等待期间 SHALL 保留侧边栏、顶部栏和页脚，不得使用路由级 fallback 替换整个后台壳。

#### Scenario: 生产环境切换菜单

- **WHEN** 用户从一个 admin 页面点击另一个菜单项且目标 RSC 尚未返回
- **THEN** 侧边栏和顶部栏继续显示，正文区域显示导航加载反馈

### Requirement: 正文区域提供导航加载反馈

admin dashboard SHALL 在正文区域显示可访问的加载状态，并在目标页面完成后移除该状态。

#### Scenario: 目标页面加载完成

- **WHEN** 菜单导航完成并渲染目标页面
- **THEN** 正文区域显示目标页面内容且不再显示导航加载提示

### Requirement: 菜单导航 API 保持兼容

菜单组件 SHALL 支持 admin 提供的导航回调，同时在未提供回调时保持现有 `Link` 导航行为。

#### Scenario: 普通菜单调用方

- **WHEN** 菜单组件未收到自定义导航回调
- **THEN** 菜单项继续使用默认链接导航

### Requirement: 后台公共 Provider 只持有全局消费者
admin dashboard 公共 Provider SHALL 只包含所有后台页面共同需要的认证、站点设置、tRPC 和查询缓存能力；媒体选择器和编辑器专属 Provider MUST 下沉到内容编辑路由。

#### Scenario: 访问普通后台列表
- **WHEN** 用户访问评论、用户、设置或链接列表
- **THEN** 公共布局不初始化文章编辑器媒体选择能力

#### Scenario: 访问文章或页面编辑器
- **WHEN** 用户进入需要富文本媒体选择的编辑路由
- **THEN** 路由局部 Provider 提供既有选图能力
