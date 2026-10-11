## ADDED Requirements

### Requirement: Web App Manifest 按当前语言生成
系统 MUST 为每个受支持的语言提供 `/{locale}/manifest.webmanifest`，且 MUST NOT 保留根路径 `/manifest.webmanifest` 入口。Manifest 的 `name`、`short_name` 和 `description` SHALL 使用该语言的站点设置，设置缺失时沿用当前默认文案；`start_url` SHALL 指向该语言的首页。生成 Manifest 时 MUST 在请求阶段读取站点设置，构建阶段不得依赖生产数据库连接。

#### Scenario: 请求中文 Manifest
- **WHEN** 浏览器请求 `/zh/manifest.webmanifest`
- **THEN** 返回的名称和描述使用中文站点设置，起始地址为 `/zh/`

#### Scenario: 请求英文 Manifest
- **WHEN** 浏览器请求 `/en/manifest.webmanifest`
- **THEN** 返回的名称和描述使用英文站点设置，起始地址为 `/en/`

#### Scenario: 构建时没有生产数据库连接
- **WHEN** 在无法连接生产数据库的构建环境中构建应用
- **THEN** 构建过程不读取站点设置，Manifest 请求时才读取设置

#### Scenario: 访问根路径 Manifest
- **WHEN** 浏览器请求 `/manifest.webmanifest`
- **THEN** 系统不提供该根路径入口
