let proxyConfig = {
  mode: "fixed_servers",
  rules: {
    singleProxy: {
      scheme: "socks5",
      host: "127.0.0.1",
      port: 1080
    },
    bypassList: ["localhost", "127.0.0.1"]
  }
};

const directConfig = {
  mode: "direct"
};

let whitelistDomains = [];
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 5000; // 5秒冷却时间

// 检查域名是否匹配白名单规则
function isWhitelisted(url) {
  try {
    const hostname = new URL(url).hostname;
    return whitelistDomains.some(pattern => {
      if (pattern.startsWith('*.')) {
        const domain = pattern.slice(2);
        return hostname.endsWith(domain) || hostname === domain;
      }
      return hostname === pattern;
    });
  } catch (e) {
    return false;
  }
}

// 显示通知（带冷却时间）
function showNotification(title, message) {
  const now = Date.now();
  if (now - lastNotificationTime > NOTIFICATION_COOLDOWN) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message
    });
    lastNotificationTime = now;
  }
}

// 设置代理配置
async function setProxySettings(config) {
  try {
    // 确保配置对象的正确性
    const settings = {
      value: {
        mode: config.mode,
        rules: config.rules ? {
          singleProxy: {
            scheme: config.rules.singleProxy.scheme,
            host: config.rules.singleProxy.host,
            port: config.rules.singleProxy.port
          },
          bypassList: config.rules.bypassList || []
        } : undefined
      },
      scope: 'regular'
    };

    await chrome.proxy.settings.set(settings);
  } catch (error) {
    console.error('设置代理失败:', error);
    showNotification('Socks5 代理错误', '设置代理失败，请检查代理服务器是否正常运行');
  }
}

// 更新代理配置
function updateProxyConfig(config) {
  if (config.username && config.password) {
    // 在代理配置中添加认证信息
    proxyConfig.rules.singleProxy.username = config.username;
    proxyConfig.rules.singleProxy.password = config.password;
  }

  proxyConfig.rules.singleProxy.host = config.host;
  proxyConfig.rules.singleProxy.port = parseInt(config.port);
}

// 监听代理错误
chrome.proxy.onProxyError.addListener(function(details) {
  console.error('代理错误:', details);
  showNotification('Socks5 代理错误', '代理连接失败：' + details.error);
});

// 监听请求错误
chrome.webRequest.onErrorOccurred.addListener(
  function(details) {
    if (details.error === 'net::ERR_PROXY_CONNECTION_FAILED') {
      showNotification('Socks5 代理错误', '无法连接到代理服务器，请检查代理设置和服务器状态');
    }
  },
  {urls: ['<all_urls>']}
);

// 监听消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'toggleProxy') {
    updateProxyState(request.enabled);
  } else if (request.action === 'updateProxyConfig') {
    updateProxyConfig(request.config);
    whitelistDomains = request.config.whitelist || [];
    
    // 如果当前代理是开启状态，立即应用新配置
    chrome.storage.local.get(['proxyEnabled'], function(result) {
      if (result.proxyEnabled) {
        updateProxyState(true);
      }
    });
  }
});

async function updateProxyState(enabled) {
  try {
    // 更新代理设置
    await setProxySettings(enabled ? proxyConfig : directConfig);

    // 更新图标
    const iconPath = enabled ? {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    } : {
      "16": "icons/icon16_off.png",
      "48": "icons/icon48_off.png",
      "128": "icons/icon128_off.png"
    };

    await chrome.action.setIcon({ path: iconPath });
    
    // 保存状态
    await chrome.storage.local.set({ proxyEnabled: enabled });
  } catch (error) {
    console.error('更新代理状态失败:', error);
  }
}

// 初始化状态
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const result = await chrome.storage.local.get(['proxyEnabled', 'proxyConfig']);
    if (result.proxyConfig) {
      updateProxyConfig(result.proxyConfig);
    }
    await updateProxyState(result.proxyEnabled || false);
  } catch (error) {
    console.error('初始化代理状态失败:', error);
  }
});

// 添加新的监听器来处理请求头
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    let headers = details.requestHeaders;
    // 添加禁用缓存的头部
    headers.push({name: 'Cache-Control', value: 'no-cache'});
    headers.push({name: 'Pragma', value: 'no-cache'});
    return {requestHeaders: headers};
  },
  {urls: ['<all_urls>']},
  ['blocking', 'requestHeaders']
);

// 添加WebSocket请求监听
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // 检查是否为WebSocket请求
    if (details.url.startsWith('ws://') || details.url.startsWith('wss://')) {
      console.log('WebSocket请求:', details.url);
      // WebSocket请求将自动使用当前的代理设置
    }
    return {};
  },
  {
    urls: ['<all_urls>'],
    types: ['websocket']
  },
  ['blocking']
); 