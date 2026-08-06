# Structured Logging Specification

## Purpose

定义服务端统一结构化日志、请求关联、敏感信息保护和安全错误序列化契约。

## Requirements

### Requirement: 服务端日志使用稳定 JSON 结构
系统 SHALL 通过统一 Logger 输出单行 JSON，并 MUST 包含时间、级别、事件名、服务名和环境字段。
#### Scenario: 记录普通服务事件
- **WHEN** 服务端模块记录 info、warn 或 error 事件
- **THEN** 标准输出包含可解析的单行 JSON 和稳定公共字段

### Requirement: 请求日志可关联
系统 SHALL 为 API 请求建立 request ID，并在请求开始、完成和错误日志中使用相同标识。
#### Scenario: tRPC 请求成功
- **WHEN** 一个 tRPC procedure 成功完成
- **THEN** 完成日志包含 request ID、procedure、method、duration 和 success outcome

### Requirement: 敏感信息默认脱敏
系统 MUST 在日志输出前递归脱敏密码、token、cookie、authorization、secret、邮箱和 IP 等敏感字段，且 MUST NOT 输出请求体或数据库参数。
#### Scenario: 上下文包含秘密
- **WHEN** 日志 context 含有 password、token 或 authorization 字段
- **THEN** 输出使用统一脱敏值且原始内容不可恢复

### Requirement: 错误安全序列化
系统 SHALL 将未知错误转换为有界结构，保留 name、message、stack 和有限 cause 链，并 MUST 处理循环引用。
#### Scenario: 记录带循环 cause 的错误
- **WHEN** Logger 接收存在循环引用的未知错误
- **THEN** 日志仍可序列化且不会导致新的异常
