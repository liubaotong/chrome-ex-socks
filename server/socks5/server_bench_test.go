package socks5

import (
	"fmt"
	"net"
	"sync"
	"testing"
	"time"
)

// 基准测试：并发连接
func BenchmarkServerConcurrent(b *testing.B) {
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

	// 使用 WaitGroup 确保所有连接都完成
	var wg sync.WaitGroup
	
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			wg.Add(1)
			go func() {
				defer wg.Done()
				
				// 创建连接
				conn, err := net.Dial("tcp", addr)
				if err != nil {
					b.Errorf("连接失败: %v", err)
					return
				}
				defer conn.Close()

				// 发送握手包
				handshake := []byte{0x05, 0x01, 0x00}
				if _, err := conn.Write(handshake); err != nil {
					b.Errorf("发送握手包失败: %v", err)
					return
				}

				// 读取响应
				response := make([]byte, 2)
				if _, err := conn.Read(response); err != nil {
					b.Errorf("读取响应失败: %v", err)
					return
				}

				// 验证响应
				if response[0] != 0x05 || response[1] != 0x00 {
					b.Errorf("握手响应错误: %v", response)
					return
				}
			}()
		}
	})

	// 等待所有连接完成
	wg.Wait()
}

// 基准测试：数据传输性能
func BenchmarkDataTransfer(b *testing.B) {
	config := &Config{
		IP:   "127.0.0.1",
		Port: 1083,
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

	// 启动一个简单的 echo 服务器用于测试
	echoServer, err := net.Listen("tcp", ":8080")
	if err != nil {
		b.Fatalf("启动 echo 服务器失败: %v", err)
	}
	defer echoServer.Close()

	go func() {
		for {
			conn, err := echoServer.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				buf := make([]byte, 1024)
				for {
					n, err := c.Read(buf)
					if err != nil {
						return
					}
					c.Write(buf[:n])
				}
			}(conn)
		}
	}()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			// 通过代理连接到 echo 服务器
			conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", config.IP, config.Port))
			if err != nil {
				b.Errorf("连接代理失败: %v", err)
				continue
			}
			defer conn.Close()

			// SOCKS5 握手
			if err := performSocks5Handshake(conn); err != nil {
				b.Errorf("握手失败: %v", err)
				continue
			}

			// 发送测试数据
			testData := make([]byte, 1024)
			if _, err := conn.Write(testData); err != nil {
				b.Errorf("发送数据失败: %v", err)
				continue
			}

			// 读取响应
			response := make([]byte, 1024)
			if _, err := conn.Read(response); err != nil {
				b.Errorf("读取响应失败: %v", err)
				continue
			}
		}
	})
}

// 辅助函数：执行 SOCKS5 握手
func performSocks5Handshake(conn net.Conn) error {
	// 发送握手包
	if _, err := conn.Write([]byte{0x05, 0x01, 0x00}); err != nil {
		return fmt.Errorf("发送握手包失败: %v", err)
	}

	// 读取响应
	response := make([]byte, 2)
	if _, err := conn.Read(response); err != nil {
		return fmt.Errorf("读取握手响应失败: %v", err)
	}

	if response[0] != 0x05 || response[1] != 0x00 {
		return fmt.Errorf("握手响应错误: %v", response)
	}

	return nil
} 