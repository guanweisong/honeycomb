# Admin Media Infinite Scroll Specification

## Purpose

定义媒体管理列表的有界分页、自动加载和变更后刷新行为。

## Requirements

### Requirement: 媒体列表必须使用有界分页
媒体管理页 MUST 以固定页大小请求媒体数据。
#### Scenario: 首次加载请求第一页
- **WHEN** 用户打开媒体管理页
- **THEN** 系统使用 `page: 1` 和 `limit: 50` 请求媒体列表
#### Scenario: 后续加载请求下一页
- **WHEN** 当前页已加载且仍有未加载记录
- **THEN** 系统请求递增后的页码，并继续使用 `limit: 50`

### Requirement: 媒体列表必须支持自动滚动加载
媒体管理页 MUST 在列表底部哨兵元素进入视口时自动请求下一页，并将结果追加到当前列表。
#### Scenario: 哨兵进入视口
- **WHEN** 底部哨兵元素进入视口且仍有更多媒体记录
- **THEN** 系统请求下一页并按页码顺序追加媒体项目
#### Scenario: 已加载全部记录
- **WHEN** 已加载媒体数量大于或等于后端返回的总数量
- **THEN** 系统不再发起下一页请求

### Requirement: 分页加载必须防止重复请求
媒体管理页 MUST 在下一页请求进行中、分页结果尚未纳入缓存或列表正在重置时阻止重复的下一页请求。
#### Scenario: 请求进行中再次触发哨兵
- **WHEN** 下一页请求尚未完成且哨兵再次进入视口
- **THEN** 系统保持单个请求，不创建重复请求
#### Scenario: 重置期间触发哨兵
- **WHEN** 上传或删除成功后列表正在重置到第一页
- **THEN** 系统不会跳过第一页直接请求后续页

### Requirement: 媒体变更后必须重置分页
上传或删除媒体成功后，系统 MUST 清空已加载页并重新加载第一页，同时保留现有的选择和通知行为。
#### Scenario: 上传成功
- **WHEN** 媒体上传成功
- **THEN** 系统重置到第一页并刷新媒体列表
#### Scenario: 删除成功
- **WHEN** 媒体删除成功
- **THEN** 系统清除当前选择、重置到第一页并刷新媒体列表

### Requirement: 非浏览器观察环境必须安全降级
当 `IntersectionObserver` 不存在时，系统 MUST 不抛出运行时错误，并允许分页 hook 独立工作。
#### Scenario: 观察器不可用
- **WHEN** 页面运行在没有 `IntersectionObserver` 的环境中
- **THEN** 系统跳过哨兵观察逻辑且不抛出异常
