package socks5

import (
	"errors"
	"fmt"
	"io"
	"net"
	"sync"
)

type Config struct {
	IP       string
	Port     int
}

type Server struct {
	config *Config
	logger *Logger
}

func NewServer(config *Config) *Server {
	return &Server{
		config: config,
		logger: NewLogger(),
	}
}

func (s *Server) Start() error {
	listener, err := net.Listen("tcp", fmt.Sprintf("%s:%d", s.config.IP, s.config.Port))
	if err != nil {
		return err
	}

	s.logger.Info("服务器启动在端口 %s:%d", s.config.IP, s.config.Port)

	var wg sync.WaitGroup
	for {
		conn, err := listener.Accept()
		if err != nil {
			s.logger.Error("接受连接错误: %v", err)
			continue
		}

		wg.Add(1)
		go func() {
			defer wg.Done()
			s.handleConnection(conn)
		}()
	}
}

func (s *Server) handleConnection(conn net.Conn) {
	defer conn.Close()

	// 1. 进行身份验证
	if err := s.authenticate(conn); err != nil {
		s.logger.Error("认证失败: %v", err)
		return
	}
	s.logger.Debug("客户端认证成功")

	// 2. 处理客户端请求
	if err := s.handleRequest(conn); err != nil {
		s.logger.Error("处理请求失败: %v", err)
		return
	}
}

func (s *Server) handleRequest(conn net.Conn) error {
	// 读取请求头
	buf := make([]byte, 4)
	if _, err := conn.Read(buf); err != nil {
		return fmt.Errorf("读取请求头失败: %v", err)
	}

	// 检查版本号
	if buf[0] != 0x05 {
		return errors.New("不支持的协议版本")
	}

	// 根据请求类型处理
	switch buf[1] {
	case 0x01: // CONNECT
		return s.handleConnect(conn, buf[3])
	case 0x02: // BIND
		return errors.New("不支持 BIND 请求")
	case 0x03: // UDP ASSOCIATE
		return errors.New("不支持 UDP ASSOCIATE 请求")
	default:
		return fmt.Errorf("不支持的命令类型: %d", buf[1])
	}
}

const (
	ATYP_IPV4   = 0x01
	ATYP_DOMAIN = 0x03
	ATYP_IPV6   = 0x04
)

func (s *Server) handleConnect(conn net.Conn, atyp byte) error {
	// 1. 解析目标地址
	var host string
	var err error

	switch atyp {
	case ATYP_IPV4:
		// 读取 IPv4 地址 (4字节)
		buf := make([]byte, 4)
		if _, err := io.ReadFull(conn, buf); err != nil {
			return fmt.Errorf("读取 IPv4 地址失败: %v", err)
		}
		host = net.IPv4(buf[0], buf[1], buf[2], buf[3]).String()

	case ATYP_DOMAIN:
		// 读取域名长度
		buf := make([]byte, 1)
		if _, err := io.ReadFull(conn, buf); err != nil {
			return fmt.Errorf("读取域名长度失败: %v", err)
		}
		domainLen := int(buf[0])

		// 读取域名
		domain := make([]byte, domainLen)
		if _, err := io.ReadFull(conn, domain); err != nil {
			return fmt.Errorf("读取域名失败: %v", err)
		}
		host = string(domain)

	case ATYP_IPV6:
		// 读取 IPv6 地址 (16字节)
		buf := make([]byte, 16)
		if _, err := io.ReadFull(conn, buf); err != nil {
			return fmt.Errorf("读取 IPv6 地址失败: %v", err)
		}
		host = net.IP(buf).String()

	default:
		return fmt.Errorf("不支持的地址类型: %d", atyp)
	}

	// 2. 读取端口号 (2字节)
	buf := make([]byte, 2)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return fmt.Errorf("读取端口失败: %v", err)
	}
	port := int(buf[0])<<8 | int(buf[1])

	// 3. 连接到目标服务器
	target := fmt.Sprintf("%s:%d", host, port)
	s.logger.Debug("正在连接到目标服务器: %s", target)

	targetConn, err := net.Dial("tcp", target)
	if err != nil {
		// 发送连接失败响应
		conn.Write([]byte{0x05, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})
		return fmt.Errorf("连接目标服务器失败: %v", err)
	}
	defer targetConn.Close()

	// 4. 发送连接成功响应
	// 响应格式: VER | REP | RSV | ATYP | BND.ADDR | BND.PORT
	localAddr := targetConn.LocalAddr().(*net.TCPAddr)
	response := make([]byte, 10)
	response[0] = 0x05 // VER
	response[1] = 0x00 // REP: succeeded
	response[2] = 0x00 // RSV
	response[3] = 0x01 // ATYP: IPv4
	// BND.ADDR
	copy(response[4:8], localAddr.IP.To4())
	// BND.PORT
	response[8] = byte(localAddr.Port >> 8)
	response[9] = byte(localAddr.Port & 0xff)

	if _, err := conn.Write(response); err != nil {
		return fmt.Errorf("发送连接响应失败: %v", err)
	}

	// 5. 开始双向转发数据
	s.logger.Debug("开始转发数据: %s <-> %s", conn.RemoteAddr(), target)
	
	errCh := make(chan error, 2)
	go func() {
		_, err := io.Copy(targetConn, conn)
		errCh <- err
	}()
	go func() {
		_, err := io.Copy(conn, targetConn)
		errCh <- err
	}()

	// 等待任意一个方向的数据传输出错或完成
	err = <-errCh
	if err != nil && err != io.EOF {
		return fmt.Errorf("数据转发错误: %v", err)
	}

	return nil
}