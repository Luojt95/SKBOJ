
const ADMIN_USERNAMES = ['Luojt95'];
const db = supabase.createClient(
  'https://dqkwsxmungraspslqeic.supabase.co',
  'sb_publishable_NOkN05poycZPEKgeeQz7pQ__tPR-yST'
);

// ---------- 荣誉表 ----------
const FEATURES = [
  { name: '一位数', condition: '只有一位', rp: 987654321, check: x => String(x).length === 1 },
  { name: '两位数', condition: '包含两位', rp: 87654321, check: x => String(x).length === 2 },
  { name: '三位数', condition: '包含三位', rp: 7654321, check: x => String(x).length === 3 },
  { name: '四位数', condition: '包含四位', rp: 654321, check: x => String(x).length === 4 },
  { name: '五位数', condition: '包含五位', rp: 54321, check: x => String(x).length === 5 },
  { name: '六位数', condition: '包含六位', rp: 4321, check: x => String(x).length === 6 },
  { name: '七位数', condition: '包含七位', rp: 321, check: x => String(x).length === 7 },
  { name: '八位数', condition: '包含八位', rp: 21, check: x => String(x).length === 8 },
  { name: '报警', condition: '包含"110"', rp: 110, check: x => String(x).includes('110') },
  { name: '火灾', condition: '包含"119"', rp: 119, check: x => String(x).includes('119') },
  { name: 'SOS', condition: '包含"120"', rp: 120, check: x => String(x).includes('120') },
  { name: '666', condition: '包含"666"', rp: 200, check: x => String(x).includes('666') },
  { name: '888', condition: '包含"888"', rp: 300, check: x => String(x).includes('888') },
  { name: '勾八', condition: '包含"78"或"91"', rp: 67, check: x => String(x).includes('78') || String(x).includes('91') },
  { name: '114514', condition: '包含"114514"', rp: 114514, check: x => String(x).includes('114514') },
  { name: '1919810', condition: '包含"1919810"', rp: 1919810, check: x => String(x).includes('1919810') },
  { name: '走马灯', condition: '包含"142857"', rp: 142857, check: x => String(x).includes('142857') },
  { name: '54188', condition: '包含"54188"', rp: 19999, check: x => String(x).includes('54188') },
  { name: '14524', condition: '包含"14524"', rp: 16666, check: x => String(x).includes('14524') },
  { name: '平方', condition: 'n^2', rp: 22222222, check: x => isPerfectPower(x, 2) },
  { name: '立方', condition: 'n^3', rp: 33333333, check: x => isPerfectPower(x, 3) },
  { name: '五次方', condition: 'n^5', rp: 55555555, check: x => isPerfectPower(x, 5) },
  { name: '七次方', condition: 'n^7', rp: 77777777, check: x => isPerfectPower(x, 7) },
  { name: '十一次方', condition: 'n^11', rp: 111111111, check: x => isPerfectPower(x, 11) },
  { name: '十三次方', condition: 'n^13', rp: 133333333, check: x => isPerfectPower(x, 13) },
  { name: '十七次方', condition: 'n^17', rp: 177777777, check: x => isPerfectPower(x, 17) },
  { name: '十九次方', condition: 'n^19', rp: 199999999, check: x => isPerfectPower(x, 19) },
  { name: '二十三次方', condition: 'n^23', rp: 233333333, check: x => isPerfectPower(x, 23) },
  { name: '二十九次方', condition: 'n^29', rp: 299999999, check: x => isPerfectPower(x, 29) },
  { name: '三十一次方', condition: 'n^31', rp: 311111111, check: x => isPerfectPower(x, 31) },
  { name: '三十七次方', condition: 'n^37', rp: 377777777, check: x => isPerfectPower(x, 37) },
  { name: '2的幂', condition: '2的整数次幂', rp: 222222222, check: x => isPowerOfBase(x, 2) },
  { name: '3的幂', condition: '3的整数次幂', rp: 333333333, check: x => isPowerOfBase(x, 3) },
  { name: '5的幂', condition: '5的整数次幂', rp: 555555555, check: x => isPowerOfBase(x, 5) },
  { name: '7的幂', condition: '7的整数次幂', rp: 777777777, check: x => isPowerOfBase(x, 7) },
  { name: '11的幂', condition: '11的整数次幂', rp: 1111111111, check: x => isPowerOfBase(x, 11) },
  { name: '13的幂', condition: '13的整数次幂', rp: 1333333333, check: x => isPowerOfBase(x, 13) },
  { name: '17的幂', condition: '17的整数次幂', rp: 1777777777, check: x => isPowerOfBase(x, 17) },
  { name: '19的幂', condition: '19的整数次幂', rp: 1999999999, check: x => isPowerOfBase(x, 19) },
  { name: '对子', condition: '包含两个相同的数', rp: 30, check: x => countPairs(x) >= 1 },
  { name: '两对', condition: '包含两对相同的数', rp: 400, check: x => countPairs(x) >= 2 },
  { name: '三对', condition: '包含三对相同的数', rp: 60000, check: x => countPairs(x) >= 3 },
  { name: '四对', condition: '包含四对相同的数', rp: 9000000, check: x => countPairs(x) >= 4 },
  { name: '递增', condition: '数字严格递增', rp: 123456789, check: x => isStrictIncreasing(x) },
  { name: '递减', condition: '数字严格递减', rp: 198765432, check: x => isStrictDecreasing(x) },
  { name: '山', condition: '先递增后递减', rp: 1234321, check: x => isMountain(x) },
  { name: '谷', condition: '先递减后递增', rp: 1432234, check: x => isValley(x) },
  { name: '偶数', condition: '偶数', rp: 10, check: x => x % 2 === 0 },
  { name: '奇数', condition: '奇数', rp: 10, check: x => x % 2 === 1 },
  { name: '3的倍数', condition: '能被 3 整除', rp: 30, check: x => x % 3 === 0 },
  { name: '5的倍数', condition: '能被 5 整除', rp: 50, check: x => x % 5 === 0 },
  { name: '7的倍数', condition: '能被 7 整除', rp: 70, check: x => x % 7 === 0 },
  { name: '11的倍数', condition: '能被 11 整除', rp: 110, check: x => x % 11 === 0 },
  { name: '13的倍数', condition: '能被 13 整除', rp: 130, check: x => x % 13 === 0 },
  { name: '17的倍数', condition: '能被 17 整除', rp: 170, check: x => x % 17 === 0 },
  { name: '19的倍数', condition: '能被 19 整除', rp: 190, check: x => x % 19 === 0 },
  { name: '23的倍数', condition: '能被 23 整除', rp: 230, check: x => x % 23 === 0 },
  { name: '29的倍数', condition: '能被 29 整除', rp: 290, check: x => x % 29 === 0 },
  { name: '31的倍数', condition: '能被 31 整除', rp: 310, check: x => x % 31 === 0 },
  { name: '37的倍数', condition: '能被 37 整除', rp: 370, check: x => x % 37 === 0 },
  { name: '41的倍数', condition: '能被 41 整除', rp: 410, check: x => x % 41 === 0 },
  { name: '43的倍数', condition: '能被 43 整除', rp: 430, check: x => x % 43 === 0 },
  { name: '47的倍数', condition: '能被 47 整除', rp: 470, check: x => x % 47 === 0 },
  { name: '53的倍数', condition: '能被 53 整除', rp: 530, check: x => x % 53 === 0 },
  { name: '59的倍数', condition: '能被 59 整除', rp: 590, check: x => x % 59 === 0 },
  { name: '61的倍数', condition: '能被 61 整除', rp: 610, check: x => x % 61 === 0 },
  { name: '67的倍数', condition: '能被 67 整除', rp: 670, check: x => x % 67 === 0 },
  { name: '71的倍数', condition: '能被 71 整除', rp: 710, check: x => x % 71 === 0 },
  { name: '73的倍数', condition: '能被 73 整除', rp: 730, check: x => x % 73 === 0 },
  { name: '79的倍数', condition: '能被 79 整除', rp: 790, check: x => x % 79 === 0 },
  { name: '83的倍数', condition: '能被 83 整除', rp: 830, check: x => x % 83 === 0 },
  { name: '89的倍数', condition: '能被 89 整除', rp: 890, check: x => x % 89 === 0 },
  { name: '97的倍数', condition: '能被 97 整除', rp: 970, check: x => x % 97 === 0 },
  { name: '最大', condition: '是99999999', rp: 2000000000, check: x => x === 99999999 },
];

function isPerfectPower(x, p) {
  if (x < 0) return false;
  if (x === 0 || x === 1) return true;
  const r = Math.round(Math.pow(x, 1/p));
  for (let k = Math.max(2, r - 2); k <= r + 2; k++) {
    let v = 1;
    for (let i = 0; i < p; i++) v *= k;
    if (v === x) return true;
  }
  return false;
}

function isPowerOfBase(x, base) {
  if (x < 1) return false;
  let v = 1;
  while (v < x) v *= base;
  return v === x;
}

function countPairs(x) {
  const s = String(x);
  const freq = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  let pairs = 0;
  for (const k in freq) pairs += Math.floor(freq[k] / 2);
  return pairs;
}

function isStrictIncreasing(x) {
  const s = String(x);
  if (s.length < 2) return false;
  for (let i = 1; i < s.length; i++) if (+s[i] <= +s[i-1]) return false;
  return true;
}

function isStrictDecreasing(x) {
  const s = String(x);
  if (s.length < 2) return false;
  for (let i = 1; i < s.length; i++) if (+s[i] >= +s[i-1]) return false;
  return true;
}

function isMountain(x) {
  const s = String(x);
  if (s.length < 3) return false;
  let peak = -1;
  for (let i = 1; i < s.length - 1; i++) {
    if (+s[i] > +s[i-1] && +s[i] > +s[i+1]) { peak = i; break; }
  }
  if (peak === -1) return false;
  for (let i = 1; i <= peak; i++) if (+s[i] <= +s[i-1]) return false;
  for (let i = peak + 1; i < s.length; i++) if (+s[i] >= +s[i-1]) return false;
  return true;
}

function isValley(x) {
  const s = String(x);
  if (s.length < 3) return false;
  let valley = -1;
  for (let i = 1; i < s.length - 1; i++) {
    if (+s[i] < +s[i-1] && +s[i] < +s[i+1]) { valley = i; break; }
  }
  if (valley === -1) return false;
  for (let i = 1; i <= valley; i++) if (+s[i] >= +s[i-1]) return false;
  for (let i = valley + 1; i < s.length; i++) if (+s[i] <= +s[i-1]) return false;
  return true;
}

function getRarity(rp) {
  if (rp <= 100) return 'Shit';
  if (rp <= 200) return 'Trash';
  if (rp <= 500) return 'Common';
  if (rp <= 1000) return 'Uncommon';
  if (rp <= 5000) return 'Super';
  if (rp <= 20000) return 'Copper';
  if (rp <= 100000) return 'Silver';
  if (rp <= 200000) return 'Gold';
  return 'Mythic';
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
  else if (path === '/admin' || path === '/admin.html') initAdmin();
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

async function recalcAllRP() {
  if (!confirm('确定要重新测算所有用户的 RP 吗？')) return;
  const btn = document.querySelector('#adminArea button');
  if (btn) { btn.disabled = true; btn.textContent = '重测中...'; }

  const { data: users, error } = await db.from('profiles')
    .select('id, username, lucky_number');
  if (error) {
    alert('读取用户失败：' + error.message);
    if (btn) { btn.disabled = false; btn.textContent = 'RP 重测'; }
    return;
  }

  let done = 0, failed = 0;
  for (const u of users) {
    const { badges, totalRP } = evaluateNumber(u.lucky_number);
    const { error: upErr } = await db.from('profiles').update({
      lucky_rp: totalRP,
      lucky_badges: badges
    }).eq('id', u.id);
    if (upErr) failed++; else done++;
  }

  alert(`重测完成：成功 ${done} 个，失败 ${failed} 个`);
  if (btn) { btn.disabled = false; btn.textContent = 'RP 重测'; }
  initAdmin();
}
