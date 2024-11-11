package main

import (
	"flag"
	"log"
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

	// 创建并启动服务器
	server := socks5.NewServer(config)
	log.Fatal(server.Start())
}