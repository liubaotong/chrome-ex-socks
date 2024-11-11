// 添加输入验证函数
function validateInput(host, port) {
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  let isValid = true;

  // 清除之前的错误状态
  hostInput.classList.remove('invalid');
  portInput.classList.remove('invalid');
  
  // 验证主机地址
  if (!host) {
    showInputError(hostInput, '请输入服务器地址');
    isValid = false;
  } else if (!host.match(/^[\w\.-]+$/) && !host.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
    showInputError(hostInput, '请输入有效的服务器地址');
    isValid = false;
  }
  
  // 验证端口
  const portNum = parseInt(port);
  if (!port) {
    showInputError(portInput, '请输入端口号');
    isValid = false;
  } else if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    showInputError(portInput, '端口号必须在 1-65535 之间');
    isValid = false;
  }
  
  return isValid;
}

// 显示输入错误
function showInputError(input, message) {
  input.classList.add('invalid');
  
  // 创建或更新错误消息
  let errorDiv = input.parentElement.querySelector('.error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    input.parentElement.appendChild(errorDiv);
  }
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
}

// 清除输入错误
function clearInputError(input) {
  input.classList.remove('invalid');
  const errorDiv = input.parentElement.querySelector('.error-message');
  if (errorDiv) {
    errorDiv.classList.remove('show');
  }
}

// 保存设置
async function saveOptions() {
  const host = document.getElementById('host').value.trim();
  const port = document.getElementById('port').value.trim();

  if (!host || !port) {
    showStatus('请填写服务器地址和端口', false);
    return;
  }

  if (!validateInput(host, port)) {
    return;
  }

  // 收集白名单域名
  const whitelistInputs = document.querySelectorAll('.whitelist-input');
  const whitelist = Array.from(whitelistInputs)
    .map(input => input.value.trim())
    .filter(value => value !== '');

  try {
    await chrome.storage.local.set({
      proxyConfig: {
        host,
        port: parseInt(port)
      },
      whitelistDomains: whitelist
    });

    // 修改消息发送方式，使用 Promise 处理响应
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ 
        action: 'updateProxyConfig',
        config: { 
          host, 
          port: parseInt(port),
          whitelist
        }
      }, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    showStatus('设置已保存', true);
  } catch (error) {
    showStatus('保存设置失败: ' + error.message, false);
  }
}

// 加载设置
async function loadOptions() {
  const result = await chrome.storage.local.get('proxyConfig');
  const config = result.proxyConfig || {
    host: '127.0.0.1',
    port: 1080
  };

  document.getElementById('host').value = config.host;
  document.getElementById('port').value = config.port;
}

// 添加输入格式化
function formatWhitelistInput(input) {
  let value = input.value.trim().toLowerCase();
  
  // 如果输入的不是域名格式，尝试修正
  if (value && !value.match(/^(\*\.)?\w+([.-]\w+)*\.\w{2,}$/)) {
    // 移除非法字符
    value = value.replace(/[^a-z0-9.*-]/g, '');
    
    // 确保通配符格式正确
    if (value.startsWith('*') && !value.startsWith('*.')) {
      value = '*.' + value.substring(1);
    }
    
    input.value = value;
  }
}

// 添加白名单项
function addWhitelistItem(value = '') {
  const container = document.getElementById('whitelist-items');
  const item = document.createElement('div');
  item.className = 'whitelist-item';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'whitelist-input';
  input.value = value;
  input.placeholder = '输入域名，例如：*.example.com';
  
  // 添加输入事件监听
  input.addEventListener('input', () => formatWhitelistInput(input));
  input.addEventListener('blur', () => formatWhitelistInput(input));
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '删除';
  removeBtn.onclick = () => {
    item.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => container.removeChild(item), 300);
  };
  
  item.appendChild(input);
  item.appendChild(removeBtn);
  
  // 添加动画效果
  item.style.animation = 'fadeIn 0.3s ease';
  container.appendChild(item);
}

// 加载白名单设置
async function loadWhitelist() {
  const result = await chrome.storage.local.get('whitelistDomains');
  const whitelist = result.whitelistDomains || [];
  
  const container = document.getElementById('whitelist-items');
  container.innerHTML = '';
  whitelist.forEach(domain => addWhitelistItem(domain));
}

// 显示状态消息
function showStatus(message, success) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = 'status ' + (success ? 'success' : 'error');
  status.style.display = 'block';
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

// 更新代理状态显示
async function updateProxyStateUI() {
  const result = await chrome.storage.local.get(['proxyEnabled']);
  const enabled = result.proxyEnabled || false;
  
  const stateText = document.getElementById('proxyState');
  const toggleBtn = document.getElementById('toggleProxy');
  
  stateText.textContent = enabled ? '已启用' : '已关闭';
  stateText.style.color = enabled ? '#4CAF50' : '#666';
  
  toggleBtn.textContent = enabled ? '关闭代理' : '开启代理';
  toggleBtn.className = 'toggle-button' + (enabled ? ' enabled' : '');
}

// 切换代理状态
async function toggleProxy() {
  const result = await chrome.storage.local.get(['proxyEnabled']);
  const newState = !result.proxyEnabled;
  
  await chrome.runtime.sendMessage({ 
    action: 'toggleProxy',
    enabled: newState
  });
  
  await updateProxyStateUI();
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  
  .whitelist-item {
    animation: fadeIn 0.3s ease;
  }
`;
document.head.appendChild(style);

// 添加配置导出函数
async function exportConfig() {
  try {
    const result = await chrome.storage.local.get(['proxyConfig', 'whitelistDomains']);
    const config = {
      proxyConfig: result.proxyConfig,
      whitelistDomains: result.whitelistDomains || []
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `socks5-proxy-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showStatus('配置已导出', true);
  } catch (error) {
    showStatus('导出配置失败: ' + error.message, false);
  }
}

// 添加配置导入函数
async function importConfig(file) {
  try {
    const text = await file.text();
    const config = JSON.parse(text);
    
    // 验证配置文件格式
    if (!config.proxyConfig || !config.proxyConfig.host || !config.proxyConfig.port) {
      throw new Error('无效的配置文件格式');
    }
    
    // 验证导入的配置
    if (!validateInput(config.proxyConfig.host, config.proxyConfig.port)) {
      throw new Error('导入的配置包含无效值');
    }
    
    await chrome.storage.local.set({
      proxyConfig: config.proxyConfig,
      whitelistDomains: config.whitelistDomains || []
    });
    
    await loadOptions();
    await loadWhitelist();
    showStatus('配置已导入', true);
  } catch (error) {
    showStatus('导入配置失败: ' + error.message, false);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  await loadWhitelist();
  await updateProxyStateUI();
  
  // 添加输入验证事件
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  
  hostInput.addEventListener('input', () => clearInputError(hostInput));
  portInput.addEventListener('input', () => clearInputError(portInput));
  
  // 添加导入/导出事件监听
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importInput').click();
  });
  
  document.getElementById('importInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importConfig(e.target.files[0]);
      e.target.value = ''; // 清除选择的文件
    }
  });
  
  document.getElementById('exportBtn').addEventListener('click', exportConfig);
  
  // 其他事件监听
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('addWhitelist').addEventListener('click', () => addWhitelistItem());
  document.getElementById('toggleProxy').addEventListener('click', toggleProxy);
  
  // 监听存储变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.proxyEnabled) {
      updateProxyStateUI();
    }
  });
}); 