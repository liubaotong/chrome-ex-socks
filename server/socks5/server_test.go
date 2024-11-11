package socks5

import (
	"fmt"
	"net"
	"testing"
	"time"
)

// 测试服务器基本功能
func TestServerBasic(t *testing.T) {
	// 创建测试配置
	config := &Config{
		IP:   "127.0.0.1",
		Port: 1081,
	}

	// 启动服务器
	server := NewServer(config)
	go func() {
		if err := server.Start(); err != nil {
			t.Errorf("服务器启动失败: %v", err)
		}
	}()

	// 等待服务器启动
	time.Sleep(time.Second)

	// 测试连接
	addr := fmt.Sprintf("%s:%d", config.IP, config.Port)
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatalf("连接服务器失败: %v", err)
	}
	defer conn.Close()

	// 测试SOCKS5握手
	// 发送客户端握手包
	handshake := []byte{0x05, 0x01, 0x00}
	if _, err := conn.Write(handshake); err != nil {
		t.Fatalf("发送握手包失败: %v", err)
	}

	// 读取服务器响应
	response := make([]byte, 2)
	if _, err := conn.Read(response); err != nil {
		t.Fatalf("读取握手响应失败: %v", err)
	}

	// 验证响应
	if response[0] != 0x05 || response[1] != 0x00 {
		t.Fatalf("握手响应错误: %v", response)
	}
}

// 测试无效的协议版本
func TestInvalidProtocolVersion(t *testing.T) {
	config := &Config{
		IP:   "127.0.0.1",
		Port: 1082,
	}

	server := NewServer(config)
	go func() {
		if err := server.Start(); err != nil {
			t.Errorf("服务器启动失败: %v", err)
		}
	}()

	time.Sleep(time.Second)

	conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", config.IP, config.Port))
	if err != nil {
		t.Fatalf("连接服务器失败: %v", err)
	}
	defer conn.Close()

	// 发送无效的协议版本
	handshake := []byte{0x04, 0x01, 0x00}
	if _, err := conn.Write(handshake); err != nil {
		t.Fatalf("发送握手包失败: %v", err)
	}

	// 读取响应
	response := make([]byte, 2)
	if _, err := conn.Read(response); err == nil {
		t.Fatal("期望连接被关闭，但是没有")
	}
}

// 测试白名单功能
func TestWhitelist(t *testing.T) {
	// ... 可以添加白名单相关的测试 ...
}

// 测试并发连接
func TestConcurrentConnections(t *testing.T) {
	config := &Config{
		IP:   "127.0.0.1",
		Port: 1083,
	}

	server := NewServer(config)
	go func() {
		if err := server.Start(); err != nil {
			t.Errorf("服务器启动失败: %v", err)
		}
	}()

	time.Sleep(time.Second)

	// 创建多个并发连接
	for i := 0; i < 10; i++ {
		go func(id int) {
			conn, err := net.Dial("tcp", fmt.Sprintf("%s:%d", config.IP, config.Port))
			if err != nil {
				t.Errorf("连接 %d 失败: %v", id, err)
				return
			}
			defer conn.Close()

			// 发送握手包
			handshake := []byte{0x05, 0x01, 0x00}
			if _, err := conn.Write(handshake); err != nil {
				t.Errorf("连接 %d 发送握手包失败: %v", id, err)
				return
			}

			// 读取响应
			response := make([]byte, 2)
			if _, err := conn.Read(response); err != nil {
				t.Errorf("连接 %d 读取响应失败: %v", id, err)
				return
			}

			if response[0] != 0x05 || response[1] != 0x00 {
				t.Errorf("连接 %d 握手响应错误: %v", id, response)
			}
		}(i)
	}

	// 等待所有连接完成
	time.Sleep(time.Second * 2)
} 