package socks5

import (
	"errors"
	"fmt"
	"io"
	"net"
)

const (
	VERSION_5 = 0x05
	AUTH_NONE = 0x00
)

func (s *Server) authenticate(conn net.Conn) error {
	// 1. 读取版本和认证方法数量
	buf := make([]byte, 2)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return fmt.Errorf("读取认证头失败: %v", err)
	}

	if buf[0] != VERSION_5 {
		return errors.New("不支持的协议版本")
	}

	// 2. 读取支持的认证方法列表（但我们不关心具体方法，直接使用无认证）
	methodCount := int(buf[1])
	methods := make([]byte, methodCount)
	if _, err := io.ReadFull(conn, methods); err != nil {
		return fmt.Errorf("读取认证方法失败: %v", err)
	}

	// 3. 发送无认证方法
	if _, err := conn.Write([]byte{VERSION_5, AUTH_NONE}); err != nil {
		return fmt.Errorf("发送认证方法失败: %v", err)
	}

	return nil
} 