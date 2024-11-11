// 保存设置
async function saveOptions() {
  const host = document.getElementById('host').value;
  const port = document.getElementById('port').value;

  if (!host || !port) {
    showStatus('请填写服务器地址和端口', false);
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
  
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '删除';
  removeBtn.onclick = () => container.removeChild(item);
  
  item.appendChild(input);
  item.appendChild(removeBtn);
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

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  await loadWhitelist();
  
  document.getElementById('save').addEventListener('click', saveOptions);
  document.getElementById('addWhitelist').addEventListener('click', () => addWhitelistItem());
}); 