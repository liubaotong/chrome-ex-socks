# Socks5 代理管理器

一个简单的 Chrome 扩展，用于管理 Socks5 代理设置。

## 功能特点

- 快速开启/关闭代理
- 自定义代理服务器地址和端口
- 支持域名白名单
- 配置导入/导出
- 浏览器启动时自动关闭代理

## 使用方法

1. 安装扩展
2. 点击工具栏图标开启/关闭代理
3. 右键点击图标，选择"选项"进入设置页面
4. 在设置页面配置代理服务器信息和白名单

## 开发说明

### 目录结构
├── plugin/ # Chrome 扩展目录
│ ├── icons/ # 图标文件
│ ├── background.js # 后台脚本
│ ├── options.html # 设置页面
│ ├── options.js # 设置页面脚本
│ └── manifest.json # 扩展配置文件
└── server/ # Socks5 代理服务器
├── main.go # 服务器入口
└── socks5/ # Socks5 协议实现

### 构建和运行

1. 构建代理服务器：
```bash
cd server
go build
```

2. 运行代理服务器：
```bash
./socks5-proxy -ip 127.0.0.1 -port 1080
```

3. 在 Chrome 中加载扩展：
- 打开 chrome://extensions/
- 开启"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择 plugin 目录