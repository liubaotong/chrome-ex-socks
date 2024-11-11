package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"github.com/liubaotong/socks5-proxy/socks5"
)

func main() {
	// 定义命令行参数
	ip := flag.String("ip", "127.0.0.1", "代理服务器监听的IP地址")
	port := flag.Int("port", 1080, "代理服务器监听的端口")
	
	// 解析命令行参数
	flag.Parse()

	// 创建服务器配置
	config := &socks5.Config{
		IP:   *ip,
		Port: *port,
	}

	// 创建服务器
	server := socks5.NewServer(config)

	// 处理信号
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// 启动服务器
	go func() {
		if err := server.Start(); err != nil {
			log.Printf("服务器错误: %v", err)
			sigChan <- syscall.SIGTERM
		}
	}()

	// 等待信号
	sig := <-sigChan
	log.Printf("收到信号 %v，正在关闭服务器...", sig)
}