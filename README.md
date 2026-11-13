# Cementarii

整合個人常用功能的《原神》資料庫＆工具平台

## 主要功能

- 首頁
  - 兌換碼清單
  - 樹脂快速計算
- 角色資料查詢
  - 數值、天賦、命之座、故事與語音
  - 強化後技能與差異標示
  - 衣裝切換
  - 頁面背景可選擇自動取色或元素背景
- 武器資料查詢
- 聖遺物資料查詢
- 素材（僅角色和武器相關）資料查詢
- 實用工具
  - 樹脂計算器

### 待實現

#### 網站功能

- [ ] 首頁：每日開啟秘境列表
- [ ] 樹脂計算器：背景提醒
- [ ] 樹脂計算器：HoYoLab 連動功能（取得目前樹脂）
- [ ] 角色傷害計算工具
- [ ] 角色簡易排軸器
- [ ] 角色及武器養成計算＆追蹤
- [ ] 祈願匯入工具（TBD）

## 使用技術

### 前端

- [Vue 3](https://vuejs.org/) / [Nuxt 4](https://nuxt.com/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Nuxt UI](https://ui.nuxt.com/)
- [Pinia](https://pinia.vuejs.org/)
- [Nuxt i18n](https://i18n.nuxtjs.org/)（目前只有繁體中文）

### 後端

- [Nitro](https://nitro.build/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Neon Database (PostgreSQL)](https://neon.com/)

### 部署

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/)（連線至 Neon）
- [Cloudflare R2](https://developers.cloudflare.com/r2/)（圖片與影片）