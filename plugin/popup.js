document.addEventListener('DOMContentLoaded', async function() {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusText = document.getElementById('status');

  // 获取当前状态
  const result = await chrome.storage.local.get(['proxyEnabled']);
  const enabled = result.proxyEnabled || false;
  updateUI(enabled);

  // 切换按钮点击事件
  toggleBtn.addEventListener('click', async function() {
    const result = await chrome.storage.local.get(['proxyEnabled']);
    const newState = !result.proxyEnabled;
    await chrome.storage.local.set({ proxyEnabled: newState });
    updateUI(newState);
    chrome.runtime.sendMessage({ action: 'toggleProxy', enabled: newState });
  });

  function updateUI(enabled) {
    statusText.textContent = enabled ? '开启' : '关闭';
    toggleBtn.textContent = enabled ? '关闭' : '开启';
    toggleBtn.className = enabled ? 'off' : '';
  }

  // 添加设置链接点击处理
  document.getElementById('openOptions').addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}); 