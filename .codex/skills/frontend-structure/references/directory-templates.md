# 目录与文件模板

以下是按需示例，不要求一次创建全部目录。

## 简单读取

```text
src/features/<feature>/
  components/<Feature>List.tsx
  queries/<feature>.query.ts
  infrastructure/<feature>.repository.ts
```

## 普通写入

```text
src/features/<feature>/
  components/<Feature>Form.tsx
  mutations/<feature>.mutation.ts
  application/<verb>-<noun>.use-case.ts
  application/<feature>.repository.ts       # Repository 接口
  infrastructure/<feature>.repository.ts
```

## 需要 Domain 的业务操作

```text
src/features/<feature>/
  components/
  mutations/<feature>.mutation.ts
  application/<verb>-<noun>.use-case.ts
  application/<feature>.repository.ts       # Repository 接口
  domain/<noun>.ts
  infrastructure/<feature>.repository.ts
```

Domain 是 Use Case 的可选内部模块，不是所有业务操作的必备目录。按功能而不是按技术类型横向堆放文件。`src/components` 只放真正跨功能的 UI；公开页面、管理页面和功能页面保持清晰边界。文件名使用稳定、可搜索的功能名；不使用 `utils.ts`、`helpers.ts` 作为无边界垃圾桶。

Schema、模型、权限、常量和映射各自只有一个真实定义；重导出优于复制。目录重构时同步更新 import、测试和文档，并删除旧入口。

Repository 接口统一由 Application 定义，Infrastructure 提供实现；Domain 永远不访问 Repository。简单读取可以直接使用 Query Repository；任何改变持久化状态、触发外部副作用或需要多个步骤协调的行为，都必须通过 Use Case 调用。
