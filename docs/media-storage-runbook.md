# 媒体上传与对象清理部署检查

媒体上传接受 JPEG、PNG、GIF、WebP、AVIF。扩展名必须分别匹配 `.jpg/.jpeg`、`.png`、`.gif`、`.webp`、`.avif`（大小写不敏感），单文件最多 20 MiB，每批最多 20 个文件。PUT 预签名绑定 Content-Type 和 Content-Length，浏览器发送实际图片 MIME 与完整文件内容；不要改写签名请求的头或文件大小。

## R2 CORS

在对象存储 bucket 的 CORS 配置中允许站点的精确 origin，以及 PUT 和 DELETE。以下示例将 `https://example.com` 替换为部署 origin；预览站点需要单独列出。不要将允许来源扩大为任意网站。

```json
[
  {
    "AllowedOrigins": ["https://example.com"],
    "AllowedMethods": ["PUT", "DELETE"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Content-Length 由浏览器根据文件自动设置，应用不能手动设置该浏览器保留请求头。若业务还从 bucket 直接读取图片，可在对应读取规则中允许 GET/HEAD。公共资源域名与上传账户域名可能不同，请在 R2 bucket 设置上配置上传规则。

## 清理协议

预签名返回一个随机且独立的对象 key、PUT URL，以及仅针对该 key、有效期一小时的 DELETE URL。没有接受任意对象 key 的服务端删除接口。

元数据响应有三种结果：`created`、`rejected`、`indeterminate`。只有明确收到 `rejected` 才会使用 DELETE URL 清理。当前服务器仅将明确的 SQLite 约束拒绝认定为 `rejected`；数据库连接错误、超时以及丢失的响应均不能证明未提交，返回或展示“待确认”，保留对象并刷新列表供核对。

多文件上传保留已成功保存的文件，分别报告失败与待确认项。DELETE 被 CORS 拒绝或存储服务失败时，界面会显示“存储清理失败”。部署后应在测试 bucket 用浏览器核对 OPTIONS 允许 DELETE、明确拒绝后的清理、部分成功以及清理失败提示；不要用生产对象进行破坏性验证。`tests/e2e/admin/media.spec.ts` 包含这些浏览器契约，组件测试还覆盖响应丢失时禁止清理。

待确认对象需要先核对媒体元数据是否存在，再由具备权限的操作人员决定是否清理。不要按请求失败直接批量删除对象。
