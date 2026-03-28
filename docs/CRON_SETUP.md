# 定时同步做题数配置指南

## 快速配置（3步完成）

### 1. 设置环境变量
在 Coze 平台设置环境变量：
```
CRON_SECRET=your_random_secret_key_here
```
（建议使用随机字符串，如：`sk_sync_abc123xyz`）

### 2. 配置定时服务
使用以下任一免费服务：

#### cron-job.org（推荐）
1. 访问 https://cron-job.org 并注册
2. 创建新任务：
   - **URL**: `https://你的域名/api/admin/sync-stats?secret=your_random_secret_key_here`
   - **请求方式**: GET
   - **Cron表达式**: `0 3 * * *`（每天凌晨3点执行）

#### UptimeRobot
1. 访问 https://uptimerobot.com 并注册
2. 创建新的 Monitor：
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://你的域名/api/admin/sync-stats?secret=your_random_secret_key_here`

### 3. 验证
访问URL测试是否正常返回：
```json
{
  "success": true,
  "message": "已同步 X 个用户的做题统计",
  "userCount": X
}
```

---

## API 调用方式

### GET 请求（推荐定时任务使用）
```
GET /api/admin/sync-stats?secret=YOUR_CRON_SECRET
```

### POST 请求（带Header）
```
POST /api/admin/sync-stats
Header: Authorization: Bearer YOUR_CRON_SECRET
```

### 管理员页面操作
访问 `/users` 页面，点击右上角「同步做题数」按钮

---

## GitHub Actions 配置（可选）

```yaml
name: Daily Sync Stats
on:
  schedule:
    - cron: '0 19 * * *'  # UTC 19:00 = 北京时间 03:00
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync user stats
        run: |
          curl "https://你的域名/api/admin/sync-stats?secret=${{ secrets.CRON_SECRET }}"
```
