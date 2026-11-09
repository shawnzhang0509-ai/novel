# 配置免费 Upstash Redis（换浏览器也能找回粒子海）

代码里已经接好了 `/api/store`，你只需要在 Vercel 填两个环境变量。

## 1. 创建免费 Redis

1. 打开 https://upstash.com 注册（可用 GitHub）
2. **Create Database** → 选 **Redis**
3. 区域随便（靠近你即可）
4. 创建后打开数据库，切到 **REST API**
5. 复制：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 2. 填进 Vercel

1. 打开你的 Vercel 项目
2. **Settings → Environment Variables**
3. 添加上面两个变量（Production / Preview 都勾上）
4. **Deployments → ⋯ → Redeploy**（不重新部署读不到新变量）

也可在 Vercel **Storage / Marketplace** 里一键接入 Upstash，会自动写入同类变量。

## 3. 在 App 里用

1. 打开线上地址（不是本机 `localhost`，除非 `npx vercel dev`）
2. 右上角数据库图标
3. 看到 **Redis 已就绪**
4. 生成同步码 → **保存到云端**
5. 换浏览器：输入同一同步码 → **从云端拉取**

## 说明

- 不建 SQL：整份数据是 Redis 里的一条 JSON
- 同步码相当于你的私人钥匙，别发到公开地方
- 本机 `npm run dev` 默认没有 API；本地测云端请用 `npx vercel dev`
