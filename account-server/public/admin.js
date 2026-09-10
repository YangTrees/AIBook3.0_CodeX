const state = { users: [] };
const $ = selector => document.querySelector(selector);
const deploymentPrefix = location.pathname === '/AIBook' || location.pathname.startsWith('/AIBook/') ? '/AIBook' : '';
const api = async (path, options = {}) => {
  const response = await fetch(`${deploymentPrefix}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || '操作失败');
  return data;
};
const showMessage = (text, error = false) => {
  const box = $('#message');
  box.textContent = text;
  box.className = `message${error ? ' error' : ''}`;
  if (typeof box.showPopover === 'function') box.showPopover();
  else box.hidden = false;
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    if (typeof box.hidePopover === 'function') box.hidePopover();
    else box.hidden = true;
  }, 2600);
};
const formatDate = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '尚未登录';
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

async function loadUsers() {
  const data = await api('/api/admin/users');
  state.users = data.users;
  render();
}

function render() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const filter = $('#typeFilter').value;
  const users = state.users.filter(user => {
    const matchesQuery = !query || `${user.username} ${user.displayName}`.toLowerCase().includes(query);
    const matchesFilter = filter === 'all' || (filter === 'disabled' ? user.status === 'disabled' : user.accountType === filter && user.status !== 'disabled');
    return matchesQuery && matchesFilter;
  });
  $('#totalStat').textContent = state.users.filter(user => user.role !== 'admin').length;
  $('#fullStat').textContent = state.users.filter(user => user.role !== 'admin' && user.accountType === 'full' && user.status === 'active').length;
  $('#trialStat').textContent = state.users.filter(user => user.role !== 'admin' && user.accountType === 'trial' && user.status === 'active').length;
  $('#disabledStat').textContent = state.users.filter(user => user.status === 'disabled').length;
  $('#emptyState').hidden = users.length > 0;
  $('#userRows').innerHTML = users.map(user => `<tr>
    <td><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.username)}${user.role === 'admin' ? ' · 管理员' : ''}</small></td>
    <td><span class="badge ${user.accountType}">${user.accountType === 'full' ? '正式账号' : '试用账号'}</span></td>
    <td><span class="badge ${user.status}">${user.status === 'active' ? '正常' : '已停用'}</span></td>
    <td>${formatDate(user.lastLoginAt)}</td><td>${user.loginCount}</td><td>${escapeHtml(user.note) || '—'}</td>
    <td><div class="actions">${user.role === 'admin'
      ? `<button class="secondary" data-reset="${user.id}">修改密码</button>`
      : `<button class="secondary" data-type="${user.id}">${user.accountType === 'trial' ? '转为正式' : '改为试用'}</button><button class="${user.status === 'active' ? 'danger' : 'success'}" data-status="${user.id}">${user.status === 'active' ? '停用' : '恢复'}</button><button class="ghost" data-reset="${user.id}">重置密码</button>`}</div></td>
  </tr>`).join('');
}

async function boot() {
  try {
    const result = await api('/api/auth/me');
    if (result.user.role !== 'admin') throw new Error('没有后台管理权限');
    $('#loginView').hidden = true;
    $('#dashboardView').hidden = false;
    await loadUsers();
  } catch {
    $('#loginView').hidden = false;
    $('#dashboardView').hidden = true;
  }
}

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
    if (result.user.role !== 'admin') {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      throw new Error('该账号没有后台管理权限');
    }
    await boot();
  } catch (error) { showMessage(error.message, true); }
});

$('#logoutButton').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST', body: '{}' });
  location.reload();
});
$('#createButton').addEventListener('click', () => $('#accountDialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));

$('#accountForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const input = Object.fromEntries(new FormData(form));
  submitButton.disabled = true;
  submitButton.textContent = '创建中…';
  try {
    await api('/api/admin/users', { method: 'POST', body: JSON.stringify(input) });
    form.reset();
    $('#accountDialog').close();
    await loadUsers();
    showMessage('账号创建成功');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '创建账号';
  }
});

$('#passwordForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const input = Object.fromEntries(new FormData(form));
  submitButton.disabled = true;
  submitButton.textContent = '保存中…';
  try {
    await api(`/api/admin/users/${input.userId}/reset-password`, { method: 'POST', body: JSON.stringify({ password: input.password }) });
    form.reset();
    $('#passwordDialog').close();
    await loadUsers();
    showMessage('密码已重置');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '保存新密码';
  }
});

$('#userRows').addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.type || button.dataset.status || button.dataset.reset;
  const user = state.users.find(item => item.id === id);
  if (!user) return;
  if (button.dataset.reset) {
    $('#passwordForm [name=userId]').value = id;
    $('#passwordTarget').textContent = `正在修改：${user.displayName}（${user.username}）`;
    $('#passwordDialog').showModal();
    return;
  }
  try {
    if (button.dataset.type) await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ accountType: user.accountType === 'trial' ? 'full' : 'trial' }) });
    if (button.dataset.status) await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ status: user.status === 'active' ? 'disabled' : 'active' }) });
    showMessage('账号状态已更新');
    await loadUsers();
  } catch (error) { showMessage(error.message, true); }
});

$('#searchInput').addEventListener('input', render);
$('#typeFilter').addEventListener('change', render);
boot();
