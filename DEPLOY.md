# huazhangbusiness.com 部署步骤（GitHub + Vercel）

## 1) 推送到 GitHub

```bash
cd ~/\.openclaw/workspace/deploy/huazhangbusiness-site

# 替换为你的仓库地址
git remote add origin git@github.com:<你的用户名>/huazhangbusiness-site.git

git branch -M main
git push -u origin main
```

## 2) 在 Vercel 导入仓库

1. 打开 https://vercel.com/new
2. 选择 `huazhangbusiness-site`
3. Framework Preset 选 `Other`
4. Build Command 留空
5. Output Directory 留空
6. 点 Deploy

## 3) 绑定域名 huazhangbusiness.com

1. Vercel 项目设置 -> Domains
2. 添加：
   - `huazhangbusiness.com`
   - `www.huazhangbusiness.com`
3. 按页面提示去 DNS 平台添加记录（通常是 A/CNAME）

## 4) 注意（后台保存）

当前后台 `admin.html` 调用 `/api/content` 并写入本地 `content.json`。
在无状态托管平台（如 Vercel）上，写入不会持久保存。

可选方案：
- 快速上线：仅展示站点，后台暂时不用保存。
- 生产方案：把内容存储改到数据库（Supabase/飞书多维表格等）。
