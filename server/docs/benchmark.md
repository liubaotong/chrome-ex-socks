# 性能测试说明

## 测试环境要求

- 操作系统：Linux/macOS/Windows
- Go 版本：1.20 或更高
- 网络环境：稳定的网络连接

## 运行测试

1. 基础功能测试
```bash
go test ./...
```

2. 压力测试
```bash
go test -bench=. -benchmem ./...
```

3. 覆盖率测试
```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## 测试项目

1. 并发连接测试 (BenchmarkServerConcurrent)
   - 测试服务器处理多个并发连接的能力
   - 验证连接建立和认证过程的性能

2. 数据传输测试 (BenchmarkDataTransfer)
   - 测试数据转发性能
   - 验证大量数据传输时的稳定性

## 性能指标

- 并发连接数：支持 1000+ 并发连接
- 响应时间：连接建立 < 100ms
- 内存使用：每个连接 < 10KB
- CPU 使用率：正常负载下 < 50% 