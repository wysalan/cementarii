import { analyticsConfig, siteConfig } from "./app/site.config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxt/image",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/i18n",
    "@nuxt/scripts",
  ],

  scripts: {
    registry: process.env.UMAMI_WEBSITE_ID
      ? {
          umamiAnalytics: {
            websiteId: process.env.UMAMI_WEBSITE_ID,
            domains: [analyticsConfig.domain],
            scriptInput: process.env.UMAMI_SCRIPT_URL
              ? { src: process.env.UMAMI_SCRIPT_URL }
              : undefined,
            trigger: "onNuxtReady",
            // 直接連到 Umami，不經由本站代理（讓使用者可以自行封鎖）
            proxy: false,
            bundle: false,
          },
        }
      : {},
  },

  css: ["@/assets/css/main.css", "@/assets/css/fonts.css"],

  app: {
    head: {
      title: siteConfig.title,
      htmlAttrs: {
        lang: siteConfig.language,
      },
      meta: [
        {
          name: "description",
          content: siteConfig.description,
        },
      ],
    },
    rootAttrs: {
      id: "site-content",
    },
  },
  icon: {
    serverBundle: { collections: ["lucide"] },
    clientBundle: { icons: ["lucide:sun", "lucide:moon"], scan: true },
  },
  image: {
    provider: "none",
  },

  i18n: {
    defaultLocale: "zh-TW",
    strategy: "no_prefix",
    locales: [
      {
        code: "zh-TW",
        language: "zh-TW",
        name: "繁體中文",
        file: "zh-TW.json",
      },
    ],
  },

  typescript: {
    tsConfig: {
      include: ["./app/types/*", "../test/app/**/*"],
      compilerOptions: {
        types: ["node"],
      },
    },
  },

  nitro: {
    preset: "cloudflare-module",
    typescript: { tsConfig: { include: ["../test/server/**/*"] } },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
    alias: {
      // pg 的原生模組（選用），Workers 無法使用，以空模組取代
      "pg-native": "unenv/mock/empty",
    },
    storage: {
      cache: { driver: "cloudflare-kv-binding", binding: "CACHE" },
    },
    devStorage: {
      cache: { driver: "memory" },
    },
  },
});
