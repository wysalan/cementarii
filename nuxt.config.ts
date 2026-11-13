import { siteConfig } from "./app/site.config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxt/image",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@nuxtjs/i18n",
  ],

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
    devStorage: {
      cache: { driver: "memory" },
    },
  },
});
