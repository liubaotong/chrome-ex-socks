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
  mode: "direct",
  rules: null
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
        return hostname === domain || hostname.endsWith('.' + domain);
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
    // 直连模式
    if (config.mode === "direct") {
      await chrome.proxy.settings.set({
        value: { mode: "direct" },
        scope: 'regular'
      });
      return;
    }

    // 构建白名单规则
    const bypassList = ["localhost", "127.0.0.1"];
    if (whitelistDomains && whitelistDomains.length > 0) {
      whitelistDomains.forEach(domain => {
        if (domain.startsWith('*.')) {
          // 将 *.example.com 转换为 Chrome 代理格式
          const baseDomain = domain.slice(2);
          bypassList.push(
            // 只添加通配符格式，不再添加其他变体
            `[*.]${baseDomain}`    // Chrome 推荐的通配符格式
          );
        } else {
          bypassList.push(domain);
        }
      });
    }

    // 设置代理配置
    const proxySettings = {
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "socks5",
            host: config.rules.singleProxy.host,
            port: config.rules.singleProxy.port
          },
          bypassList: Array.from(new Set(bypassList)) // 去重
        }
      },
      scope: 'regular'
    };

    console.log('正在设置代理配置:', JSON.stringify(proxySettings, null, 2));
    await chrome.proxy.settings.set(proxySettings);

    // 验证配置是否生效
    const currentSettings = await chrome.proxy.settings.get({});
    console.log('当前白名单规则:', bypassList);
  } catch (error) {
    console.error('设置代理失败:', error);
    showNotification('Socks5 代理错误', '设置代理失败，请检查代理服务器是否正常运行');
  }
}

// 更新代理配置
async function updateProxyConfig(config) {
  try {
    // 更新代理配置
    proxyConfig.rules.singleProxy.host = config.host || "127.0.0.1";
    proxyConfig.rules.singleProxy.port = parseInt(config.port || 1080);
    
    // 更新白名单，确保格式正确
    whitelistDomains = (config.whitelist || []).map(domain => {
      // 统一域名格式
      domain = domain.toLowerCase().trim();
      if (domain.startsWith('*.')) {
        return domain;
      }
      return domain;
    });
    
    // 如果代理已启用，立即应用新配置
    const result = await chrome.storage.local.get(['proxyEnabled']);
    if (result.proxyEnabled) {
      await setProxySettings(proxyConfig);
    }
  } catch (error) {
    console.error('更新代理配置失败:', error);
    showNotification('Socks5 代理错误', '更新代理配置失败，请检查设置');
  }
}

// 添加图标点击事件监听
chrome.action.onClicked.addListener(async () => {
  const result = await chrome.storage.local.get(['proxyEnabled']);
  const newState = !result.proxyEnabled;
  
  // 更新存储状态
  await chrome.storage.local.set({ proxyEnabled: newState });
  
  // 更新图标状态
  await updateIcon(newState);
  
  // 更新代理设置
  await setProxySettings(newState ? proxyConfig : directConfig);
});

// 更新图标状态
async function updateIcon(enabled) {
  const path = enabled ? {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png"
  } : {
    16: "icons/icon16_off.png",
    48: "icons/icon48_off.png",
    128: "icons/icon128_off.png"
  };
  
  await chrome.action.setIcon({ path });
  await chrome.action.setTitle({ 
    title: enabled ? "代理已启用" : "代理已禁用" 
  });
}

// 监听代理错误
chrome.proxy.onProxyError.addListener(function(details) {
  console.error('代理错误:', details);
  showNotification('Socks5 代理错误', '代理连接失败：' + details.error);
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateProxyConfig') {
    updateProxyConfig(request.config)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('处理配置更新失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 表明我们会异步发送响应
  }
});

// 更新代理状态
async function updateProxyState(enabled) {
  try {
    // 设置代理
    await setProxySettings(enabled ? proxyConfig : directConfig);

    // 更新图标
    await updateIcon(enabled);
    
    // 保存状态
    await chrome.storage.local.set({ proxyEnabled: enabled });
  } catch (error) {
    console.error('更新代理状态失败:', error);
    showNotification('Socks5 代理错误', '更新代理状态失败');
  }
}

// 修改初始化代码
async function initializeProxy() {
  try {
    const result = await chrome.storage.local.get(['proxyEnabled', 'proxyConfig']);
    if (result.proxyConfig) {
      await updateProxyConfig(result.proxyConfig);
    }
    await updateProxyState(result.proxyEnabled || false);
  } catch (error) {
    console.error('初始化代理失败:', error);
    showNotification('Socks5 代理错误', '初始化代理失败');
  }
}

// 初始化
chrome.runtime.onInstalled.addListener(initializeProxy);