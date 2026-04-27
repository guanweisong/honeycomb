# 测试文档

## 测试结构

本项目采用业务代码就近原则组织测试文件：

### 📁 业务相关测试
测试文件直接放在对应的业务模块旁边，便于维护和理解：

```
src/packages/trpc/api/modules/
├── user/
│   ├── user.router.ts
│   └── user.router.test.ts     # 用户管理测试
├── post/
│   ├── post.router.ts
│   └── post.router.test.ts     # 文章管理测试
└── ...
```

### 📁 通用测试
只有跨模块的通用测试工具和配置才放在 `tests/` 目录：

```
tests/
├── setup/
│   └── vitest.setup.ts        # 全局测试设置
├── helpers/
│   └── test-utils.ts         # 通用测试工具
└── README.md                 # 测试文档
```

## 运行测试

```bash
# 运行所有测试
bun test

# 运行特定模块测试
bun test src/packages/trpc/api/modules/user/user.router.test.ts

# 监听模式
bun test --watch

# 一次性运行
bun test --run

# 测试UI界面
bun test:ui
```

## 测试覆盖的模块

- ✅ **User Router** - 用户管理（CRUD操作、权限验证）
- ✅ **Post Router** - 文章管理（基础功能测试）
- 🔄 **Other Routers** - 其他模块待补充测试

## 编写测试的注意事项

1. **ID格式**: 使用24位长度的字符串ID，符合 `IdSchema` 验证
2. **权限测试**: 管理员权限和普通用户权限的区分测试
3. **Mock设置**: 使用 `createMockDb()` 和 `createMockContext()` 工具函数
4. **错误处理**: 测试正常流程和异常情况

## 测试示例

参考现有的测试文件：
- `src/packages/trpc/api/modules/user/user.router.test.ts` - 用户管理测试
