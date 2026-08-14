## ADDED Requirements

### Requirement: 服务端 caller 传播请求上下文

服务端 tRPC caller MUST 支持接收当前请求的 `Headers`，并将其用于认证会话解析。

#### 场景：带会话请求调用鉴权 procedure

- **当** Server Component 使用当前请求 headers 创建 server caller
- **则** tRPC context 能读取对应 Better Auth 会话并执行用户权限校验

#### 场景：无 headers 调用公开 procedure

- **当** Server Component 未传 headers 调用公开 procedure
- **则** 公开 procedure 继续正常执行

### Requirement: 服务端数据访问入口

认证用户和站点设置 MUST 通过稳定的服务端函数提供给 Server Component。

#### 场景：读取后台用户

- **当** 后台 Server Component 提供当前请求 headers
- **则** 服务端函数返回启用用户或 null

#### 场景：读取站点设置

- **当** Server Component 读取站点设置
- **则** 通过统一服务端入口返回设置数据

### Requirement: 请求边界职责

业务 procedure MUST 继续由 tRPC 承载；Better Auth 协议 MUST 继续由 Better Auth 处理；R2 文件内容 MUST 通过预签名 URL 直传，不得经由 tRPC 传输文件内容。

#### 场景：客户端上传媒体

- **当** 客户端上传媒体文件
- **则** 通过 tRPC 获取预签名 URL 后直接向 R2 上传，再通过 tRPC 保存媒体元数据
