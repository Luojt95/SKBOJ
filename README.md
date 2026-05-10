# SKBOJ - OIer的在线评测系统

## 部署到 Vercel

### 1. 推送代码到 GitHub
```bash
git init
git add .
git commit -m "Initial commit: SKBOJ OJ System"
git branch -M main
git remote add origin https://github.com/你的用户名/skboj.git
git push -u origin main
```

### 2. 在 Vercel 部署
1. 访问 https://vercel.com
2. 点击 "Sign Up" → "Continue with GitHub"
3. 授权后，点击 "New Project"
4. 选择你的 GitHub 仓库 "skboj"
5. 点击 "Import"

### 3. 配置环境变量
在 Vercel 项目设置中添加以下环境变量：

```
coze_supabase_url=https://br-right-bate-93441c3e.supabase2.aidap-global.cn-beijing.volces.com
coze_supabase_anon_key=<完整key见下方>
```

### 4. 部署
点击 "Deploy"，等待几分钟即可完成！

## 功能特性
- 题目练习与提交
- 在线代码运行（C++/Python）
- 用户Rating系统
- 比赛功能
- 讨论社区

## 默认管理员账号
- 用户名: Luojt95
- 密码: 123456
