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
    if (config.mode === "direct") {
      await chrome.proxy.settings.set({
        value: { mode: "direct" },
        scope: 'regular'
      });
      return;
    }

    const bypassList = ["localhost", "127.0.0.1"];
    if (whitelistDomains?.length > 0) {
      whitelistDomains.forEach(domain => {
        if (domain.startsWith('*.')) {
          bypassList.push(`[*.]${domain.slice(2)}`);
        } else {
          bypassList.push(domain);
        }
      });
    }

    const proxySettings = {
      value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "socks5",
            host: config.rules.singleProxy.host,
            port: config.rules.singleProxy.port
          },
          bypassList: Array.from(new Set(bypassList))
        }
      },
      scope: 'regular'
    };

    await chrome.proxy.settings.set(proxySettings);
    
    // 验证设置是否生效
    const currentSettings = await chrome.proxy.settings.get({});
    if (currentSettings.value.mode !== proxySettings.value.mode) {
      throw new Error('代理设置未能正确应用');
    }
  } catch (error) {
    handleError(error, '设置代理失败');
    throw error;
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
    return true;
  }
  
  if (request.action === 'toggleProxy') {
    updateProxyState(request.enabled)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('切换代理状态失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
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
    // 强制设置为关闭状态
    await chrome.storage.local.set({ proxyEnabled: false });
    
    // 加载现有配置
    const result = await chrome.storage.local.get(['proxyConfig']);
    if (result.proxyConfig) {
      await updateProxyConfig(result.proxyConfig);
    }
    
    // 更新状态为关闭
    await updateProxyState(false);
  } catch (error) {
    console.error('初始化代理失败:', error);
    showNotification('Socks5 代理错误', '初始化代理失败');
  }
}

// 插件安装或更新时初始化
chrome.runtime.onInstalled.addListener(initializeProxy);

// 浏览器启动时初始化（确保代理为关闭状态）
chrome.runtime.onStartup.addListener(async () => {
  try {
    // 直接设置为关闭状态
    await updateProxyState(false);
    await chrome.storage.local.set({ proxyEnabled: false });
  } catch (error) {
    console.error('浏览器启动时初始化代理失败:', error);
    showNotification('Socks5 代理错误', '初始化代理失败');
  }
});

// 当扩展被挂起时（比如浏览器关闭前）确保代理被关闭
chrome.runtime.onSuspend.addListener(async () => {
  await updateProxyState(false);
});

// 优化错误处理
function handleError(error, context) {
  console.error(`${context}:`, error);
  showNotification('Socks5 代理错误', `${context}：${error.message}`);
}