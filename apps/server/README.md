### 基于Next.js的Serverless能力实现的仿Wordpress功能的纯Restfull Api服务

> 介绍见[链接](https://github.com/guanweisong/honeycomb-intro/blob/master/README.md)

## 1、云服务依赖：

- [云数据库](https://www.mongodb.com/atlas/database)
- [对象存储](https://www.cloudflare.com/developer-platform/r2/)
- [腾讯验证码](https://007.qq.com/product.html)
- [邮件服务](https://resend.com)

全部env变量：

```typescript
MONGODB_URI = "***";

R2_ACCOUNT_ID = "***";
R2_ACCESS_KEY_ID = "***";
R2_SECRET_ACCESS_KEY = "***";
R2_BUCKET_NAME = "***";

JWT_EXPIRES = "***";
JWT_SECRET = "***";

CAPTCHA_AID = "***";
CAPTCHA_APP_SECRET_KEY = "***";

RESEND_API_KEY = "***";
```
