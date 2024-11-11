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

// authenticate 处理SOCKS5认证
func (s *Server) authenticate(conn net.Conn) error {
	// 读取版本和认证方法数量
	header := make([]byte, 2)
	if _, err := io.ReadFull(conn, header); err != nil {
		return fmt.Errorf("读取认证头失败: %w", err)
	}

	// 验证版本号
	if header[0] != VERSION_5 {
		return errors.New("不支持的协议版本")
	}

	// 读取认证方法列表
	methodCount := int(header[1])
	if methodCount == 0 {
		return errors.New("没有可用的认证方法")
	}

	methods := make([]byte, methodCount)
	if _, err := io.ReadFull(conn, methods); err != nil {
		return fmt.Errorf("读取认证方法失败: %w", err)
	}

	// 发送无认证响应
	response := []byte{VERSION_5, AUTH_NONE}
	if _, err := conn.Write(response); err != nil {
		return fmt.Errorf("发送认证响应失败: %w", err)
	}

	s.logger.Debug("客户端认证成功")
	return nil
} 