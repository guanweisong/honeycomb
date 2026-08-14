# Admin 正文区域加载

## Purpose

定义 admin dashboard 菜单导航期间的后台壳稳定性和正文区域加载反馈。

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
