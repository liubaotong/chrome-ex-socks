package socks5

import (
	"fmt"
	"net"
	"testing"
	"time"
)

// 压力测试
func BenchmarkServerConcurrent(b *testing.B) {
	// 创建测试配置
	config := &Config{
		IP:   "127.0.0.1",
		Port: 1082,
	}

	// 启动服务器
	server := NewServer(config)
	go func() {
		if err := server.Start(); err != nil {
			b.Errorf("服务器启动失败: %v", err)
		}
	}()

	// 等待服务器启动
	time.Sleep(time.Second)

	addr := fmt.Sprintf("%s:%d", config.IP, config.Port)

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			// 创建连接
			conn, err := net.Dial("tcp", addr)
			if err != nil {
				b.Fatalf("连接失败: %v", err)
			}

			// 发送握手包
			handshake := []byte{0x05, 0x01, 0x00}
			if _, err := conn.Write(handshake); err != nil {
				b.Fatalf("发送握手包失败: %v", err)
			}

			// 读取响应
			response := make([]byte, 2)
			if _, err := conn.Read(response); err != nil {
				b.Fatalf("读取响应失败: %v", err)
			}

			conn.Close()
		}
	})
} 