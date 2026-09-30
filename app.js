const supabase = createClient(
  'https://dqkwsxmungraspslqeic.supabase.co',
  'sb_publishable_NOkN05poycZPEKgeeQz7pQ__tPR-yST'
);

const FEATURES = [
  
];

function getRarity(rp) {
  if (rp >= 100000000) return 'Mythic';
  if (rp >= 5000000) return 'Legendary';
  if (rp >= 1000000) return 'Epic';
  if (rp >= 100000) return 'Rare';
  if (rp >= 50000) return 'Uncommon';
  if (rp >= 10000) return 'Common';
  if (rp >= 5000) return 'Trash';
  return 'Shit';
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

// ---------- 验证码 ----------
let captchaCode = '';
function refreshCaptcha() {
  captchaCode = String(Math.floor(1000 + Math.random() * 9000));
  const canvas = document.createElement('canvas');
  canvas.width = 80; canvas.height = 30;
  const ctx = canvas.getContext('2d');
  ctx.font = '20px Arial';
  ctx.fillText(captchaCode, 10, 22);
  const img = document.getElementById('captchaImg');
  if (img) img.src = canvas.toDataURL();
}
if (document.getElementById('captchaImg')) refreshCaptcha();

// ---------- 注册 ----------
async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const pwd = document.getElementById('regPassword').value;
  const pwd2 = document.getElementById('regPassword2').value;
  const luckyStr = document.getElementById('regLucky').value.trim();

  if (!username) return alert('请输入用户名');
  if (pwd !== pwd2) return alert('两次密码不一致');
  if (document.getElementById('captchaInput').value !== captchaCode) return alert('验证码错误');
  if (!/^\d+$/.test(luckyStr)) return alert('幸运数必须是 0-9999999999 的整数');
  const lucky = parseInt(luckyStr, 10);
  if (lucky < 0 || lucky > 9999999999) return alert('幸运数必须在 0 到 9999999999 之间');

  const { data: existingUser } = await supabase
    .from('profiles').select('id').eq('username', username).maybeSingle();
  if (existingUser) return alert('该用户名已被注册，请换一个');

  const { data: existingLucky } = await supabase
    .from('profiles').select('id').eq('lucky_number', lucky).maybeSingle();
  if (existingLucky) return alert('该幸运数已被使用，请换一个');

  const email = username + '@skboj.local';
  const { data, error } = await supabase.auth.signUp({ email, password: pwd });
  if (error) return alert('注册失败：' + error.message);

  const { badges, totalRP } = evaluateNumber(lucky);
  const { error: insertError } = await supabase.from('profiles').insert({
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

// ---------- 登录 ----------
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const pwd = document.getElementById('loginPassword').value;
  const email = username + '@skboj.local';
  const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
  if (error) return alert('登录失败：' + error.message);
  location.href = '/';
}

async function signOut() {
  await supabase.auth.signOut();
  location.reload();
}

// ---------- 首页 ----------
async function initHome() {
  const { data: { user } } = await supabase.auth.getUser();
  const welcome = document.getElementById('welcomeMsg');
  const userInfo = document.getElementById('userInfo');
  if (!welcome) return;

  if (user) {
    const { data: profile } = await supabase.from('profiles')
      .select('username, lucky_number').eq('id', user.id).single();
    const name = profile ? profile.username : '用户';
    const lucky = profile ? profile.lucky_number : '';
    userInfo.innerHTML =
      `<a href="/profile/${lucky}">${name}</a> | <a href="#" onclick="signOut();return false;">退出</a>`;
    welcome.textContent = '欢迎回来，' + name;
  } else {
    welcome.textContent = '请先登录或注册';
    userInfo.innerHTML = '<a href="/login">登录</a> | <a href="/register">注册</a>';
  }
}

// ---------- 用户列表 ----------
async function initRank() {
  const div = document.getElementById('rankList');
  if (!div) return;

  const { data } = await supabase.from('profiles')
    .select('username, lucky_number, lucky_rp')
    .order('lucky_number', { ascending: true });

  if (!data || data.length === 0) {
    div.innerHTML = '<p>暂无用户</p>';
    return;
  }

  div.innerHTML = data.map((p, i) =>
    `<p>${i + 1}. <a href="/profile/${p.lucky_number}">${p.username}</a> — ` +
    `幸运数 ${p.lucky_number}，稀有度 ${p.lucky_rp}（${getRarity(p.lucky_rp)}）</p>`
  ).join('');
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

  const { data: p } = await supabase.from('profiles')
    .select('username, lucky_number, lucky_rp, lucky_badges')
    .eq('lucky_number', lucky)
    .single();

  const nameEl = document.getElementById('profileName');
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
}

// ---------- 路由 ----------
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  if (path === '/' || path === '/index.html') initHome();
  else if (path.startsWith('/profile/')) initProfile();
  else if (path === '/prize' || path === '/prize.html') initPrize();
  else if (path === '/rank' || path === '/rank.html') initRank();
});