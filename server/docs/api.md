# Socks5 代理服务器 API 文档

## 配置项

### Config 结构
```go
type Config struct {
    IP   string // 服务器监听的IP地址
    Port int    // 服务器监听的端口
}
```

### 创建服务器
```go
server := socks5.NewServer(config)
```

### 启动服务器
```go
err := server.Start()
```

## 错误码说明

- 认证失败：读取认证头失败、不支持的协议版本、没有可用的认证方法
- 请求处理：读取请求头失败、不支持的命令类型
- 连接错误：连接目标服务器失败、数据转发错误

## 日志级别

- INFO: 服务器启动、连接建立等正常信息
- ERROR: 认证失败、连接错误等异常信息
- DEBUG: 详细的连接和数据传输信息 