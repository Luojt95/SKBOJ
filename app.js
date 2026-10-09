
const ADMIN_USERNAMES = ['Luojt95'];
const db = supabase.createClient(
  'https://dqkwsxmungraspslqeic.supabase.co',
  'sb_publishable_NOkN05poycZPEKgeeQz7pQ__tPR-yST'
);

// ---------- 荣誉表 ----------
const FEATURES = [
  { name: '回文数', condition: '正读倒读一样', rp: 50,
    check: x => String(x) === String(x).split('').reverse().join('') },
  { name: '纯位数', condition: '所有数字相同', rp: 200,
    check: x => /^(\d)\1+$/.test(String(x)) },
  { name: '递增数', condition: '数字严格递增', rp: 100,
    check: x => {
      const s = String(x);
      if (s.length < 2) return false;
      for (let i = 1; i < s.length; i++) if (+s[i] <= +s[i-1]) return false;
      return true;
    } },
  { name: '递减数', condition: '数字严格递减', rp: 100,
    check: x => {
      const s = String(x);
      if (s.length < 2) return false;
      for (let i = 1; i < s.length; i++) if (+s[i] >= +s[i-1]) return false;
      return true;
    } },
  { name: '质数', condition: '只能被 1 和自身整除', rp: 80,
    check: x => {
      if (x < 2) return false;
      for (let i = 2; i * i <= x; i++) if (x % i === 0) return false;
      return true;
    } },
  { name: '完全平方数', condition: '是整数的平方', rp: 60,
    check: x => Number.isInteger(Math.sqrt(x)) },
  { name: '完全立方数', condition: '是整数的立方', rp: 100,
    check: x => Math.round(Math.cbrt(x)) ** 3 === x },
  { name: '2 的幂', condition: '是 2 的整数次幂', rp: 150,
    check: x => {
      if (x <= 0) return false;
      while (x % 2 === 0) x /= 2;
      return x === 1;
    } },
  { name: '斐波那契数', condition: '属于斐波那契数列', rp: 120,
    check: x => {
      let a = 0, b = 1;
      while (b < x) { [a, b] = [b, a + b]; }
      return x === 0 || b === x;
    } },
  { name: '含 666', condition: '数字包含 666', rp: 30,
    check: x => String(x).includes('666') },
  { name: '含 888', condition: '数字包含 888', rp: 30,
    check: x => String(x).includes('888') },
  { name: '含 999', condition: '数字包含 999', rp: 30,
    check: x => String(x).includes('999') },
  { name: '含 123', condition: '数字包含 123', rp: 25,
    check: x => String(x).includes('123') },
  { name: '含 0', condition: '数字包含 0', rp: 5,
    check: x => String(x).includes('0') },
  { name: '满 8 位', condition: '数字达到 8 位', rp: 20,
    check: x => String(x).length === 8 },
];

function getRarity(rp) {
  if (rp >= 800) return 'Mythic';
  if (rp >= 500) return 'Legendary';
  if (rp >= 300) return 'Epic';
  if (rp >= 150) return 'Rare';
  if (rp >= 80) return 'Uncommon';
  if (rp >= 30) return 'Common';
  return 'Trash';
}

function evaluateNumber(num) {
  const badges = [];
  let totalRP = 0;
  FEATURES.forEach((f, i) => {
    if (f.check(num)) {
      badges.push({ index: i, name: f.name, rp: f.rp });
      totalRP += f.rp;
    }
  });
  return { badges, totalRP, rarity: getRarity(totalRP) };
}

// ---------- 注册 ----------
async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const pwd = document.getElementById('regPassword').value;
  const pwd2 = document.getElementById('regPassword2').value;
  const luckyStr = document.getElementById('regLucky').value.trim();

  if (!username) return alert('请输入用户名');
  if (pwd !== pwd2) return alert('两次密码不一致');
  if (!/^\d+$/.test(luckyStr)) return alert('幸运数必须是 0-99999999 的整数');
  const lucky = parseInt(luckyStr, 10);
  if (lucky < 0 || lucky > 99999999) return alert('幸运数必须在 0 到 99999999 之间');

  const { data: existingUser } = await db
    .from('profiles').select('id').eq('username', username).maybeSingle();
  if (existingUser) return alert('该用户名已被注册，请换一个');

  const { data: existingLucky } = await db
    .from('profiles').select('id').eq('lucky_number', lucky).maybeSingle();
  if (existingLucky) return alert('该幸运数已被使用，请换一个');

  const email = username + '@gmail.com';
  const { data, error } = await db.auth.signUp({ email, password: pwd });
  if (error) return alert('注册失败：' + error.message);

  const { badges, totalRP } = evaluateNumber(lucky);
  const { error: insertError } = await db.from('profiles').insert({
    id: data.user.id,
    username,
    lucky_number: lucky,
    lucky_rp: totalRP,
    lucky_badges: badges
  });
  if (insertError) return alert('保存失败：' + insertError.message);

  alert('注册成功，请登录');
  location.href = '/login';
}

function checkPwdMatch() {
  const pwd = document.getElementById('regPassword').value;
  const pwd2 = document.getElementById('regPassword2').value;
  const hint = document.getElementById('pwdHint');
  if (!hint) return;
  if (!pwd2) { hint.textContent = ''; return; }
  if (pwd === pwd2) {
    hint.textContent = '✓ 两次密码一致';
    hint.style.color = 'green';
  } else {
    hint.textContent = '✗ 两次密码不一致';
    hint.style.color = 'red';
  }
}

// ---------- 登录 ----------
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const pwd = document.getElementById('loginPassword').value;
  const email = username + '@gmail.com';
  const { error } = await db.auth.signInWithPassword({ email, password: pwd });
  if (error) return alert('登录失败：' + error.message);
  location.href = '/';
}

async function signOut() {
  await db.auth.signOut();
  location.reload();
}

// ---------- 导航栏 ----------
async function initNav() {
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db.from('profiles')
        .select('username, lucky_number').eq('id', user.id).maybeSingle();
      if (profile) {
        userInfo.innerHTML =
          `<a href="/profile/${profile.lucky_number}">${profile.username}</a> | <a href="#" onclick="signOut();return false;">退出</a>`;
      } else {
        userInfo.innerHTML = '<a href="#" onclick="signOut();return false;">退出</a>';
      }
    } else {
      userInfo.innerHTML = '<a href="/login">登录</a> | <a href="/register">注册</a>';
    }
  } catch (e) {
    console.error('initNav 出错：', e);
    userInfo.innerHTML = '<a href="/login">登录</a> | <a href="/register">注册</a>';
  }
}

// ---------- 首页 ----------
async function initHome() {
  const welcome = document.getElementById('welcomeMsg');
  if (!welcome) return;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data: profile } = await db.from('profiles')
        .select('username').eq('id', user.id).maybeSingle();
      welcome.textContent = '欢迎回来，' + (profile ? profile.username : '用户');
    } else {
      welcome.textContent = '请先登录或注册';
    }
  } catch (e) {
    console.error(e);
  }
}

// ---------- 测试数字 ----------
function testNumber() {
  const input = document.getElementById('testNumber').value.trim();
  if (!/^\d+$/.test(input)) return alert('请输入 0-99999999 的整数');
  const num = parseInt(input, 10);
  if (num < 0 || num > 99999999) return alert('数字必须在 0 到 99999999 之间');

  const { badges, totalRP, rarity } = evaluateNumber(num);
  document.getElementById('testResult').innerHTML =
    `<p>数字：${num}</p>` +
    `<p>稀有度：<strong>${rarity}</strong>（${totalRP} RP）</p>` +
    `<p>命中荣誉：${badges.length
      ? badges.map(b => `${b.name}（${b.rp} RP）`).join('、')
      : '无'}</p>`;
}

// ---------- 用户列表 ----------
async function initRank() {
  const div = document.getElementById('rankList');
  if (!div) return;
  try {
    const { data, error } = await db.from('profiles')
      .select('username, lucky_number, lucky_rp')
      .order('lucky_number', { ascending: true });

    if (error) { div.innerHTML = '加载失败：' + error.message; return; }
    if (!data || data.length === 0) { div.innerHTML = '<p>暂无用户</p>'; return; }

    div.innerHTML = data.map((p, i) =>
      `<p>${i + 1}. <a href="/profile/${p.lucky_number}">${p.username}</a> — ` +
      `幸运数 ${p.lucky_number}，稀有度 ${p.lucky_rp}（${getRarity(p.lucky_rp)}）</p>`
    ).join('');
  } catch (e) {
    div.innerHTML = '加载出错：' + e.message;
    console.error(e);
  }
}

// ---------- 荣誉列表 ----------
function initPrize() {
  const div = document.getElementById('prizeList');
  if (!div) return;
  div.innerHTML = FEATURES.map(f =>
    `<p>${f.name}（${f.rp} RP） - ${f.condition}</p>`
  ).join('');
}

// ---------- 个人中心 ----------
async function initProfile() {
  const lucky = location.pathname.split('/').pop();
  if (!lucky || isNaN(lucky)) { location.href = '/'; return; }

  const nameEl = document.getElementById('profileName');
  try {
    const { data: p } = await db.from('profiles')
      .select('username, lucky_number, lucky_rp, lucky_badges')
      .eq('lucky_number', lucky)
      .maybeSingle();

    if (!p) { nameEl.textContent = '用户不存在'; return; }

    nameEl.textContent = p.username;
    document.getElementById('luckyNumber').textContent = p.lucky_number;
    document.getElementById('luckyRP').textContent =
      `${p.lucky_rp}（${getRarity(p.lucky_rp)}）`;

    const badges = p.lucky_badges || [];
    const ul = document.getElementById('badgeList');
    ul.innerHTML = badges.length
      ? badges.map(b => `<li>${b.name}（${b.rp} RP）</li>`).join('')
      : '<li>无</li>';
  } catch (e) {
    nameEl.textContent = '加载出错';
    console.error(e);
  }
}

// ---------- 路由 ----------
async function init() {
  await initNav();
  const path = location.pathname;
  if (path === '/' || path === '/index.html') initHome();
  else if (path.startsWith('/profile/')) initProfile();
  else if (path === '/prize' || path === '/prize.html') initPrize();
  else if (path === '/rank' || path === '/rank.html') initRank();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
// ---------- 管理面板 ----------
async function initAdmin() {
  const msg = document.getElementById('adminMsg');
  const area = document.getElementById('adminArea');
  if (!msg) return;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { msg.textContent = '请先登录'; return; }
    const { data: profile } = await db.from('profiles')
      .select('username').eq('id', user.id).maybeSingle();
    if (!profile || !ADMIN_USERNAMES.includes(profile.username)) {
      msg.textContent = '你没有权限访问此页面';
      return;
    }
    msg.textContent = '管理员：' + profile.username;
    area.style.display = 'block';

    const { data } = await db.from('profiles')
      .select('id, username, lucky_number, lucky_rp')
      .order('lucky_number', { ascending: true });

    const rows = document.getElementById('userRows');
    if (!data || data.length === 0) {
      rows.innerHTML = '<tr><td colspan="4">暂无用户</td></tr>';
      return;
    }
    rows.innerHTML = data.map(p => `
      <tr>
        <td>${p.username}</td>
        <td>
          <input type="number" value="${p.lucky_number}" id="lucky_${p.id}" style="width:130px">
          <button onclick="updateLucky('${p.id}')">保存</button>
        </td>
        <td>${p.lucky_rp}（${getRarity(p.lucky_rp)}）</td>
        <td><button onclick="deleteUser('${p.id}', '${p.username}')" style="color:red">注销</button></td>
      </tr>
    `).join('');
  } catch (e) {
    msg.textContent = '加载出错：' + e.message;
    console.error(e);
  }
}

async function updateLucky(userId) {
  const input = document.getElementById('lucky_' + userId);
  const luckyStr = input.value.trim();
  if (!/^\d+$/.test(luckyStr)) return alert('幸运数必须是 0-99999999 的整数');
  const lucky = parseInt(luckyStr, 10);
  if (lucky < 0 || lucky > 99999999) return alert('幸运数必须在 0 到 99999999 之间');

  const { data: existing } = await db.from('profiles')
    .select('id').eq('lucky_number', lucky).maybeSingle();
  if (existing && existing.id !== userId) return alert('该幸运数已被使用');

  const { badges, totalRP } = evaluateNumber(lucky);
  const { error } = await db.from('profiles').update({
    lucky_number: lucky,
    lucky_rp: totalRP,
    lucky_badges: badges
  }).eq('id', userId);
  if (error) return alert('修改失败：' + error.message);
  alert('已修改');
  initAdmin();
}

async function deleteUser(userId, username) {
  if (!confirm(`确定注销用户 ${username}？所有数据将永久删除。`)) return;
  const { error } = await db.rpc('delete_user', { target_id: userId });
  if (error) return alert('注销失败：' + error.message);
  alert('已注销');
  initAdmin();
}
