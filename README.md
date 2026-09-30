```markdown
# SKBOJ · 数字稀有度测试

一个轻量的数字稀有度测试网站。注册时选择一个 0–9999999999 的幸运数，系统根据预设规则计算稀有度（RP），并在个人中心展示幸运数、稀有度和获得的荣誉。

## 功能

- **注册 / 登录**：用户名 + 密码 + 4 位图片验证码，无需邮箱
- **幸运数**：注册时填写，全局唯一，不可修改
- **稀有度计算**：注册时立即计算，存入数据库
- **用户列表**：按幸运数升序展示所有用户
- **荣誉列表**：展示所有可获得的荣誉及其条件、RP
- **个人中心**：`/profile/[幸运数]`，展示用户名、幸运数、稀有度、获得的荣誉

## 技术栈

- 前端：纯 HTML + JavaScript
- 后端 / 数据库：Supabase（认证 + Postgres）
- 部署：Vercel
- 代码托管：GitHub

## 文件结构

```
app.js           所有逻辑（注册、登录、稀有度计算、页面初始化）
index.html       首页
register.html    注册页
login.html       登录页
rank.html        用户列表
prize.html       荣誉列表
profile.html     个人中心
vercel.json      路由配置
package.json     项目声明
```

## 快速开始

### 1. 创建 Supabase 项目

在 [supabase.com](https://supabase.com) 新建项目，然后在 **SQL Editor** 执行：

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  lucky_number BIGINT UNIQUE NOT NULL,
  lucky_rp INT DEFAULT 0,
  lucky_badges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE INDEX idx_profiles_lucky ON profiles(lucky_number);
```

### 2. 关闭邮箱验证

Supabase 后台 → **Authentication** → **Sign In / Providers** → **Email** → 关闭 **Confirm email**。

### 3. 填写 Supabase 密钥

在 `app.js` 顶部替换成你自己的：

```js
const supabase = createClient(
  '你的 Project URL',
  '你的 Publishable key'
);
```

### 4. 部署到 Vercel

1. 把代码推送到 GitHub 仓库
2. 在 Vercel 导入该仓库
3. 绑定你的域名
4. 部署完成后即可访问

## 荣誉规则

所有荣誉定义在 `app.js` 的 `FEATURES` 数组中。每条包含：

```js
{ name: '荣誉名', condition: '描述', rp: 50, check: x => /* 判断逻辑 */ }
```